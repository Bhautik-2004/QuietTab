// newtab.js

// CONFIGURATION
const CONFIG = {
    quotesUrl: chrome.runtime.getURL('data/quotes.json'),
    minDisplayTime: 4000
};

// STATE
let quotesData = [];
let currentCategory = 'general';
let userPreferences = {
    fontFamily: 'serif',
    fontSize: 'l',
    contextAware: true
};

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
                     // Refresh if context mode changed
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
        chrome.storage.sync.get(['fontFamily', 'fontSize', 'contextAware'], (items) => {
            userPreferences = {
                fontFamily: items.fontFamily || 'serif',
                fontSize: items.fontSize || 'l',
                contextAware: items.contextAware !== false // Default true
            };
            resolve();
        });
    });
}

function applyAppearance() {
    const root = document.documentElement;
    
    // Font Family
    const fonts = {
        'serif': '"Playfair Display", Georgia, serif',
        'sans': '"Inter", "Segoe UI", sans-serif',
        'mono': '"Fira Code", monospace',
        'helvetica': '"Helvetica Neue", Helvetica, Arial, sans-serif',
        'garamond': '"Apple Garamond", "Garamond", "Baskerville", "Times New Roman", serif',
        'cormorant': '"Cormorant Garamond", "Garamond", serif'
    };
    root.style.setProperty('--font-serif', fonts[userPreferences.fontFamily] || fonts['serif']);

    // Font Size Scaling
    const sizes = {
        'm': { xl: 'clamp(1.25rem, 3vw, 2rem)', sm: '0.8rem' },
        'l': { xl: 'clamp(1.75rem, 5vw, 3rem)', sm: '1rem' },
        'xl': { xl: 'clamp(2.5rem, 7vw, 4.5rem)', sm: '1.2rem' }
    };
    const size = sizes[userPreferences.fontSize] || sizes['l'];
    
    root.style.setProperty('--text-size-xl', size.xl);
    root.style.setProperty('--text-size-sm', size.sm);

    // Dynamic Theme (Random or Context-based)
    applyRandomTheme(root);
}

function applyRandomTheme(root) {
    // Curated high-quality gradients
    const themes = [
        { name: 'Deep Space', start: '#0f172a', mid: '#312e81', end: '#020617', text: 'light' },
        { name: 'Aurora', start: '#134e4a', mid: '#115e59', end: '#042f2e', text: 'light' },
        { name: 'Sunset', start: '#9f1239', mid: '#881337', end: '#4c0519', text: 'light' },
        { name: 'Dusk', start: '#4a044e', mid: '#701a75', end: '#2e1065', text: 'light' },
        { name: 'Ocean', start: '#1e3a8a', mid: '#1d4ed8', end: '#172554', text: 'light' },
        { name: 'Forest', start: '#14532d', mid: '#166534', end: '#052e16', text: 'light' },
        { name: 'Slate', start: '#334155', mid: '#475569', end: '#1e293b', text: 'light' },
        // Lighter themes for contrast check
        { name: 'Morning', start: '#f0f9ff', mid: '#e0f2fe', end: '#bae6fd', text: 'dark' },
        { name: 'Peach', start: '#fff1f2', mid: '#ffe4e6', end: '#fecdd3', text: 'dark' }
    ];

    const theme = themes[Math.floor(Math.random() * themes.length)];
    
    root.style.setProperty('--bg-start', theme.start);
    root.style.setProperty('--bg-mid', theme.mid);
    root.style.setProperty('--bg-end', theme.end);

    if (theme.text === 'dark') {
        root.style.setProperty('--text-primary', 'rgba(17, 24, 39, 0.95)');
        root.style.setProperty('--text-secondary', 'rgba(55, 65, 81, 0.8)');
        root.style.setProperty('--text-shadow', 'none');
    } else {
        root.style.setProperty('--text-primary', 'rgba(255, 255, 255, 0.95)');
        root.style.setProperty('--text-secondary', 'rgba(255, 255, 255, 0.7)');
        root.style.setProperty('--text-shadow', '0 4px 12px rgba(0,0,0,0.3)');
    }
    
    // console.log(`[Quiet Quotes] Applied theme: ${theme.name}`);
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
            // console.log(`[Quiet Quotes] Mode: ${currentCategory}`);
            resolve(currentCategory);
        });
    });
}

/**
 * 5. Select & Display Quote
 */
function selectQuote() {
    let relevantQuotes = quotesData;
    
    // 1. Definition of Category Mappings
    // Maps scraper categories (keys) to JSON tags/categories (values)
    const categoryMap = {
        'coding': ['technology', 'science', 'work', 'success', 'intelligence', 'programming', 'computers', 'logic'],
        'productivity': ['work', 'success', 'time', 'action', 'motivation', 'business', 'leadership'],
        'creative': ['art', 'beauty', 'poetry', 'imagination', 'writing', 'create', 'music'],
        'learning': ['education', 'knowledge', 'wisdom', 'history', 'science', 'philosophy', 'books'],
        'wellbeing': ['life', 'happiness', 'peace', 'faith', 'health', 'mindfulness', 'calm', 'nature', 'hope']
    };

    if (currentCategory !== 'general') {
        const targetKeywords = categoryMap[currentCategory] || [currentCategory];
        
        const filtered = quotesData.filter(q => {
           // Helper to safely check inclusion
           const hasText = (txt) => {
               if (!txt) return false;
               const lower = txt.toLowerCase();
               // EXACT MATCH check first for category (e.g. "science" === "science")
               // or substring match for tags
               return targetKeywords.some(keyword => lower === keyword || lower.includes(keyword));
           };
           
           const catMatch = hasText(q.Category);
           const tagMatch = q.Tags && Array.isArray(q.Tags) && q.Tags.some(t => hasText(t));
           
           return catMatch || tagMatch;
       });
       
       if (filtered.length > 0) {
           relevantQuotes = filtered;
       } else {
           console.warn(`[Quiet Quotes] No quotes found for context: ${currentCategory} using keywords: ${targetKeywords.join(', ')}`);
       }
    }

    // Filter out long quotes to ensure they fit properly on screen without scrolling
    // (Approx 200 chars is roughly 3-4 lines on desktop)
    relevantQuotes = relevantQuotes.filter(q => q.Quote.length < 220);
    
    // If we filtered everything out, revert to original list (safety net)
    if (relevantQuotes.length === 0) relevantQuotes = quotesData;

    if (relevantQuotes.length === 0) return quotesData[0]; // Safe fallback

    const randomIndex = Math.floor(Math.random() * relevantQuotes.length);
    const selected = relevantQuotes[randomIndex];
    
    // Context Indicator
    const contextEl = document.getElementById('context-indicator');
    if (contextEl && currentCategory !== 'general') {
        const formattedCategory = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1);
        contextEl.textContent = `Inspired by your interest in ${formattedCategory}`;
    } else if (contextEl) {
        contextEl.textContent = ''; // Clean look for general/default
    }
    
    return selected;
}

function displayQuote() {
    if (!quotesData || quotesData.length === 0) return;

    const quote = selectQuote();
    
    // Reset opacity to trigger fade
    quoteTextEl.style.opacity = 0;
    
    setTimeout(() => {
        quoteTextEl.textContent = `“${quote.Quote}”`;
        quoteAuthorEl.textContent = quote.Author;
        
        // Fade in
        quoteTextEl.style.opacity = 1;

        // Save history
        chrome.storage.local.set({ 
            last_view_time: Date.now(),
            last_quote: quote.Quote 
        });
    }, 200);
}

/**
 * 7. Clock Logic
 */
function startClock() {
    updateTime();
    // Sync seconds to update precisely on the minute change if desired, 
    // but 1s interval is simple and sufficient for HH:MM
    setInterval(updateTime, 1000);
}

function updateTime() {
    if (!clockEl) return;
    
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    clockEl.textContent = `${hours}:${minutesStr} ${ampm}`;
}

/**
 * 6. Event Listeners
 */
function setupEventListeners() {
    if (!settingsBtn || !settingsFrame) {
        console.error("Settings elements missing!");
        return;
    }

    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent immediate closing
        const isVisible = settingsFrame.classList.contains('visible');
        if (isVisible) {
            settingsFrame.classList.remove('visible');
            settingsFrame.setAttribute('aria-hidden', 'true');
        } else {
            settingsFrame.classList.add('visible');
            settingsFrame.setAttribute('aria-hidden', 'false');
            // settingsFrame.focus(); // Focus iframe if needed
        }
    });

    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
        if (settingsFrame.classList.contains('visible') && !settingsFrame.contains(e.target) && e.target !== settingsBtn) {
             settingsFrame.classList.remove('visible');
             settingsFrame.setAttribute('aria-hidden', 'true');
        }
    });
}

// Start
document.addEventListener('DOMContentLoaded', init);
