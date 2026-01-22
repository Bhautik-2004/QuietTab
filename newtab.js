// newtab.js

// CONFIGURATION
const CONFIG = {
    quotesUrl: chrome.runtime.getURL('data/quotes.json'),
    minDisplayTime: 4000
};

// SETTINGS DEFAULTS
const DEFAULTS = {
    // Legacy
    fontFamily: 'serif',
    contextAware: true,
    fontSize: 'l',
    showSeconds: false,
    showDate: false,
    
    // New Background Settings
    bgType: 'plane',
    noiseStrength: 40,
    noiseDensity: 13,
    color1: '#ff5005',
    color2: '#dbba95',
    color3: '#d0bce1',
    speed: 40
};

// STATE
let quotesData = [];
let currentCategory = 'general';
let userPreferences = { ...DEFAULTS };

// DOM ELEMENTS
const quoteTextEl = document.getElementById('quote-text');
const quoteAuthorEl = document.getElementById('quote-author');
const clockEl = document.getElementById('clock');
const settingsBtn = document.getElementById('settings-trigger');
const settingsFrame = document.getElementById('settings-frame');

/**
 * 1. Initialize Extension
 */
async function init() {
    try {
        await loadSettings();
        applyAppearance();
        startClock();
        await loadQuotes();
        await getContext();
        displayQuote();
        setupEventListeners();
        
        // Listen for changes from Settings page
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync') {
                loadSettings().then(() => {
                    applyAppearance();
                     if (changes.contextAware) displayQuote(); 
                });
            }
        });
    } catch (error) {
        console.error("Initialization failed:", error);
        if(quoteTextEl) quoteTextEl.textContent = "Failed to load quotes. Please check console.";
    }
}

/**
 * 2. Load Settings & Preferences
 */
function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(DEFAULTS, (items) => {
            userPreferences = items;
            resolve();
        });
    });
}

function applyAppearance() {
    const root = document.documentElement;
    const prefs = userPreferences;

    // 1. Font Family
    const fonts = {
        'serif': '"Playfair Display", Georgia, serif',
        'sans': '"Inter", "Segoe UI", sans-serif',
        'mono': '"Space Mono", "Fira Code", monospace',
        'cormorant': '"Cormorant Garamond", "Garamond", serif',
        'lora': '"Lora", serif',
        'montserrat': '"Montserrat", sans-serif',
        'satisfy': '"Satisfy", cursive'
    };
    root.style.setProperty('--font-serif', fonts[prefs.fontFamily] || fonts['serif']);

    // 2. Background Colors
    root.style.setProperty('--bg-color-1', prefs.color1);
    root.style.setProperty('--bg-color-2', prefs.color2);
    root.style.setProperty('--bg-color-3', prefs.color3);

    // Save for anti-flash
    localStorage.setItem('qq_bg_color_1', prefs.color1);

    // 3. Shape / Type
    const meshContainer = document.getElementById('mesh-container');
    if (meshContainer) {
        meshContainer.className = 'mesh-background'; // Reset
        meshContainer.classList.add(`type-${prefs.bgType}`); // type-plane, type-water, type-sphere
    }

    // 4. Randomize Orb Positions (Non-deterministic)
    randomizeOrbs();

    // 5. Texture Noise
    root.style.setProperty('--noise-opacity', prefs.noiseStrength / 100);
    
    // Update SVG primitive directly for density
    const turbulence = document.querySelector('feTurbulence');
    if (turbulence) {
        // Map 0-50 slider to 0.5-2.5 frequency
        const freq = 0.5 + (prefs.noiseDensity / 50) * 2.0;
        turbulence.setAttribute('baseFrequency', freq.toFixed(3));
    }

    // 4. Motion Speed
    // Map 0-100 to 60s-5s (inverse)
    const duration = 60 - (prefs.speed / 100 * 55);
    const speedVal = `${Math.max(5, duration)}s`; // Increased min speed so it doesn't fly too fast
    root.style.setProperty('--anim-speed', speedVal);

    // 5. Text Contrast (Auto)
    const lum = getLuminance(prefs.color1); 
    // We base contrast mainly on Color 1 as it is the base color
    if (lum > 0.5) {
        // Light bg -> Dark text
        root.style.setProperty('--text-primary', 'rgba(17, 24, 39, 0.95)');
        root.style.setProperty('--text-secondary', 'rgba(55, 65, 81, 0.8)');
        root.style.setProperty('--text-shadow', 'none');
    } else {
        // Dark bg -> Light text
        root.style.setProperty('--text-primary', 'rgba(255, 255, 255, 0.95)');
        root.style.setProperty('--text-secondary', 'rgba(255, 255, 255, 0.7)');
        root.style.setProperty('--text-shadow', '0 4px 12px rgba(0,0,0,0.3)');
    }
}

function randomizeOrbs() {
    const orbs = document.querySelectorAll('.mesh-orb');
    orbs.forEach(orb => {
        // Random starting position offset
        const randomX = Math.random() * 20 - 10; // -10% to 10%
        const randomY = Math.random() * 20 - 10;
        
        // Random duration modifier
        const randomDur = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x speed
        
        orb.style.transform = `translate(${randomX}%, ${randomY}%)`;
        orb.style.animationDuration = `calc(var(--anim-speed) * ${randomDur})`;
        orb.style.animationDelay = `${Math.random() * -20}s`; // Random start point in cycle
    });
}

// Helper: Calculate relative luminance
function getLuminance(hex) {
    if (!hex) return 0;
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * 3. Load Quotes Data
 */
async function loadQuotes() {
  try {
      const response = await fetch(CONFIG.quotesUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      quotesData = data; 
  } catch (err) {
      console.error('Failed to load quotes', err);
      // Fallback
      quotesData = [{ Quote: "Simplicity is the ultimate sophistication.", Author: "Leonardo da Vinci", Category: "creative" }];
  }
}

/**
 * 4. Get User Context
 */
function getContext() {
    return new Promise((resolve) => {
        if (!userPreferences.contextAware) {
             currentCategory = 'general';
             resolve('general');
             return;
        }

        chrome.storage.local.get(['current_context_category'], (result) => {
            currentCategory = result.current_context_category || 'general';
            resolve(currentCategory);
        });
    });
}

/**
 * 5. Select & Display Quote
 */
function selectQuote() {
    let relevantQuotes = quotesData;
    
    // Simple category mapping (could be expanded)
    const categoryKeywords = {
        'coding': ['technology', 'programming', 'logic', 'science'],
        'productivity': ['work', 'success', 'time', 'action'],
        'creative': ['art', 'imagination', 'create', 'beauty'],
        'wellbeing': ['peace', 'happiness', 'mind', 'health']
    };

    if (currentCategory !== 'general') {
        const keywords = categoryKeywords[currentCategory] || [currentCategory];
        relevantQuotes = quotesData.filter(q => {
            const txt = (q.Category || '') + ' ' + (q.Tags || []).join(' ');
            return keywords.some(k => txt.toLowerCase().includes(k));
        });
    }

    if (!relevantQuotes || relevantQuotes.length === 0) relevantQuotes = quotesData;
    if (relevantQuotes.length === 0) return quotesData[0];

    const randomIndex = Math.floor(Math.random() * relevantQuotes.length);
    const selected = relevantQuotes[randomIndex];

    // Context Indicator
    const contextEl = document.getElementById('context-indicator');
    if (contextEl && userPreferences.contextAware) {
        if (currentCategory && currentCategory !== 'general') {
             contextEl.textContent = `Inspired by ${currentCategory}`;
             contextEl.style.opacity = 0.6;
        } else {
            contextEl.textContent = '';
            contextEl.style.opacity = 0;
        }
    }
    
    return selected;
}

function displayQuote() {
    if (!quotesData || quotesData.length === 0) return;
    const quote = selectQuote();

    // Pre-calculate sizing class BEFORE showing
    // Remove both opacity and size transition to prevent "morphing" visual
    quoteTextEl.style.transition = 'none'; 
    quoteTextEl.style.opacity = 0;
    
    // Set content and class immediately while hidden
    quoteTextEl.textContent = `“${quote.Quote}”`;
    quoteAuthorEl.textContent = quote.Author;
    
    if (quote.Quote.length > 150) {
        quoteTextEl.classList.add('long-text');
    } else {
        quoteTextEl.classList.remove('long-text');
    }

    // Force reflow to ensure the new class is applied before we fade in
    void quoteTextEl.offsetWidth; 

    // Restore transition and fade in
    setTimeout(() => {
        quoteTextEl.style.transition = 'opacity 0.8s ease';
        quoteTextEl.style.opacity = 1;
    }, 50);
}

/**
 * 7. Clock Logic
 */
function startClock() {
    updateTime();
    setInterval(updateTime, 1000);
}

function updateTime() {
    if (!clockEl) return;
    const now = new Date();
    
    // 1. Time
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; 
    
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const secondsStr = seconds < 10 ? '0' + seconds : seconds;
    
    let timeHtml = `${hours}:${minutesStr}`;
    if (userPreferences.showSeconds) {
        timeHtml += `<span class="seconds">:${secondsStr}</span>`;
    }
    timeHtml += ` ${ampm}`;

    // 2. Date
    if (userPreferences.showDate) {
        const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
        const dateStr = now.toLocaleDateString('en-US', dateOptions);
        clockEl.innerHTML = `
            <div class="time-main">${timeHtml}</div>
            <div class="date-sub">${dateStr}</div>
        `;
        clockEl.classList.add('has-date');
    } else {
        clockEl.innerHTML = timeHtml;
        clockEl.classList.remove('has-date');
    }
}

/**
 * 6. Event Listeners
 */
function setupEventListeners() {
    if (!settingsBtn || !settingsFrame) return;

    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = settingsFrame.classList.contains('visible');
        if (isVisible) {
            settingsFrame.classList.remove('visible');
            settingsFrame.setAttribute('aria-hidden', 'true');
        } else {
            settingsFrame.classList.add('visible');
            settingsFrame.setAttribute('aria-hidden', 'false');
        }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (settingsFrame.classList.contains('visible') && 
            !settingsFrame.contains(e.target) && 
            !settingsBtn.contains(e.target)) {
            settingsFrame.classList.remove('visible');
            settingsFrame.setAttribute('aria-hidden', 'true');
        }
    });
}

init();
