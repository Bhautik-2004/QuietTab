// newtab.js

// CONFIGURATION
const CONFIG = {
    quotesUrl: chrome.runtime.getURL('data/quotes.json'),
    minDisplayTime: 4000
};

const PIN_LIMIT = 12;

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
let pinnedSites = [];

// DOM ELEMENTS
const quoteTextEl = document.getElementById('quote-text');
const quoteAuthorEl = document.getElementById('quote-author');
const clockEl = document.getElementById('clock');
const settingsBtn = document.getElementById('settings-trigger');
const settingsFrame = document.getElementById('settings-frame');
const pinnedGrid = document.getElementById('pinned-grid');

/**
 * 1. Initialize Extension
 */
async function init() {
    try {
        await loadSettings();
        applyAppearance();
        await loadPinnedSites();
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

                if (changes.pinnedSites && pinnedGrid) {
                    pinnedSites = Array.isArray(changes.pinnedSites.newValue) ? changes.pinnedSites.newValue : [];
                    renderPinnedSites();
                }
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

            // Cache colors to localStorage for instant load in newtab.html
            localStorage.setItem('qq_bg_color_1', items.color1);
            localStorage.setItem('qq_bg_color_2', items.color2);
            localStorage.setItem('qq_bg_color_3', items.color3);

            resolve();
        });
    });
}

function loadPinnedSites() {
    return new Promise((resolve) => {
        if (!pinnedGrid) {
            resolve();
            return;
        }

        chrome.storage.sync.get({ pinnedSites: [] }, (items) => {
            pinnedSites = Array.isArray(items.pinnedSites) ? items.pinnedSites : [];
            renderPinnedSites();
            resolve();
        });
    });
}

function savePinnedSites() {
    chrome.storage.sync.set({ pinnedSites });
}

function renderPinnedSites() {
    if (!pinnedGrid) return;

    pinnedGrid.innerHTML = '';

    pinnedSites.slice(0, PIN_LIMIT).forEach((site, index) => {
        const card = createPinCard(site, index);
        pinnedGrid.appendChild(card);
    });

    const addCard = document.createElement('button');
    addCard.type = 'button';
    addCard.id = 'add-pin';
    addCard.className = 'pin-card pin-add';
    addCard.setAttribute('aria-label', 'Add pinned site');
    addCard.innerHTML = '<span aria-hidden="true">+</span><span class="pin-add-label">Add site</span>';
    addCard.addEventListener('click', handleAddPin);
    pinnedGrid.appendChild(addCard);
}

function createPinCard(site, index) {
    const card = document.createElement('div');
    card.className = 'pin-card';
    card.setAttribute('role', 'listitem');
    const titleText = site.title || getHostname(site.url);

    // Link Wrapper (so clicking the card goes to site)
    const link = document.createElement('a');
    link.href = site.url;
    link.className = 'pin-link';
    link.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;';
    link.setAttribute('aria-label', `Open ${titleText}`);
    
    // Icon
    const iconWrap = document.createElement('div');
    iconWrap.className = 'pin-icon';
    iconWrap.textContent = getSiteInitials(titleText);

    const iconImg = document.createElement('img');
    iconImg.src = getFaviconUrl(site.url);
    iconImg.alt = '';
    iconImg.loading = 'lazy';
    iconImg.decoding = 'async';
    iconImg.addEventListener('load', () => {
        if (iconImg.naturalWidth > 1) {
             iconWrap.classList.add('has-img');
        }
    });
    iconImg.addEventListener('error', () => iconWrap.classList.remove('has-img'));
    iconWrap.appendChild(iconImg);

    // Title
    const title = document.createElement('span');
    title.className = 'pin-title';
    title.textContent = titleText;
    title.title = titleText;

    // Menu Trigger (3 dots)
    const menuBtn = document.createElement('button');
    menuBtn.className = 'pin-menu-trigger';
    menuBtn.innerHTML = '⋮'; // entity
    menuBtn.setAttribute('aria-label', 'Options');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.style.zIndex = '2'; // Above link

    // Menu Dropdown
    const menu = document.createElement('div');
    menu.className = 'pin-menu';
    menu.style.zIndex = '3';

    const editBtn = document.createElement('button');
    editBtn.className = 'pin-menu-item';
    editBtn.textContent = 'Edit';
    editBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openEditDialog(index);
        menu.classList.remove('visible');
        card.classList.remove('menu-open');
    };

    const removeBtn = document.createElement('button');
    removeBtn.className = 'pin-menu-item danger';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        pinnedSites.splice(index, 1);
        savePinnedSites();
        renderPinnedSites();
        // card is removed, so no need to remove class
    };

    menu.appendChild(editBtn);
    menu.appendChild(removeBtn);

    // Toggle Menu
    menuBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Close others
        document.querySelectorAll('.pin-menu.visible').forEach(m => {
            if (m !== menu) { 
                m.classList.remove('visible');
                const p = m.closest('.pin-card');
                if (p) p.classList.remove('menu-open');
            }
        });
        document.querySelectorAll('.pin-menu-trigger[aria-expanded="true"]').forEach(b => {
             if (b !== menuBtn) b.setAttribute('aria-expanded', 'false');
        });

        const isVisible = menu.classList.contains('visible');
        if (isVisible) {
            menu.classList.remove('visible');
            menuBtn.setAttribute('aria-expanded', 'false');
            card.classList.remove('menu-open');
        } else {
            menu.classList.add('visible');
            menuBtn.setAttribute('aria-expanded', 'true');
            card.classList.add('menu-open');
        }
    };

    card.appendChild(link);
    card.appendChild(iconWrap);
    card.appendChild(title);
    card.appendChild(menuBtn);
    card.appendChild(menu);

    return card;
}

function handleAddPin() {
    openEditDialog();
}

function openEditDialog(index = -1) {
    const dialog = document.getElementById('add-pin-dialog');
    const form = document.getElementById('add-pin-form');
    const urlInput = document.getElementById('pin-url');
    const nameInput = document.getElementById('pin-name');
    const cancelBtn = document.getElementById('btn-cancel-pin');
    const titleEl = document.getElementById('dialog-title');
    
    // Setup State
    const isEdit = index >= 0;
    titleEl.textContent = isEdit ? 'Edit Shortcut' : 'Add Shortcut';
    
    if (isEdit) {
        urlInput.value = pinnedSites[index].url;
        nameInput.value = pinnedSites[index].title;
    } else {
        urlInput.value = '';
        nameInput.value = '';
    }

    const closeDialog = () => {
        dialog.classList.remove('visible');
        // Clean up listeners
        if (window.dialogOutsideHandler) {
            document.removeEventListener('click', window.dialogOutsideHandler);
            window.dialogOutsideHandler = null;
        }
    };

    // Remove old form submit handler
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Get fresh references
    const freshForm = document.getElementById('add-pin-form');
    const freshCancelBtn = document.getElementById('btn-cancel-pin');
    const freshUrlInput = document.getElementById('pin-url');
    const freshNameInput = document.getElementById('pin-name');
    
    // Restore values after cloning
    freshUrlInput.value = urlInput.value;
    freshNameInput.value = nameInput.value;
    
    // Attach cancel handler
    freshCancelBtn.onclick = (e) => {
        e.preventDefault();
        closeDialog();
    };

    // Attach submit handler
    freshForm.onsubmit = (e) => {
        e.preventDefault();

        const rawUrl = freshUrlInput.value.trim();
        if (!rawUrl) return;

        let normalized = rawUrl;
        if (!/^https?:\/\//i.test(normalized)) {
            normalized = `https://${normalized}`;
        }

        let parsed;
        try {
            parsed = new URL(normalized);
        } catch (err) {
            alert('Please enter a valid URL.');
            return;
        }

        const suggestedName = getHostname(parsed.href);
        const label = freshNameInput.value.trim() || suggestedName;
        const siteData = { url: parsed.href, title: label.trim() };

        if (isEdit) {
            pinnedSites[index] = siteData;
        } else {
            pinnedSites = [siteData, ...pinnedSites.filter(site => site.url !== siteData.url)].slice(0, PIN_LIMIT);
        }
        
        savePinnedSites();
        renderPinnedSites();
        closeDialog();
    };
    
    // Show dialog
    dialog.classList.add('visible');
    
    // Focus input with delay
    setTimeout(() => freshUrlInput.focus(), 50);
    
    // Close on outside click (with cleanup)
    setTimeout(() => {
        if (window.dialogOutsideHandler) {
            document.removeEventListener('click', window.dialogOutsideHandler);
        }
        
        window.dialogOutsideHandler = (e) => {
            if (!dialog.contains(e.target) && dialog.classList.contains('visible')) {
                closeDialog();
            }
        };
        document.addEventListener('click', window.dialogOutsideHandler);
    }, 100);
}

// Global click to close menus
document.addEventListener('click', (e) => {
    if (!e.target.closest('.pin-menu-trigger') && !e.target.closest('.pin-menu')) {
        document.querySelectorAll('.pin-menu.visible').forEach(m => {
            m.classList.remove('visible');
            const c = m.closest('.pin-card');
            if (c) c.classList.remove('menu-open');
        });
        document.querySelectorAll('.pin-menu-trigger[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    }
});

function getFaviconUrl(url) {
    return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;
}

function getHostname(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch (err) {
        return url;
    }
}

function getSiteInitials(label = '') {
    const clean = label.replace(/https?:\/\//i, '').replace('www.', '');
    const parts = clean.split(/[\s.-]+/).filter(Boolean);
    if (parts.length === 0) return '•';
    const first = parts[0].charAt(0);
    const second = parts.length > 1 ? parts[1].charAt(0) : (parts[0].charAt(1) || '');
    return (first + second).toUpperCase();
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
        root.style.setProperty('--tile-bg', 'rgba(17, 24, 39, 0.04)');
        root.style.setProperty('--tile-border', 'rgba(17, 24, 39, 0.06)');
        root.style.setProperty('--tile-hover', 'rgba(17, 24, 39, 0.08)');
    } else {
        // Dark bg -> Light text
        root.style.setProperty('--text-primary', 'rgba(255, 255, 255, 0.95)');
        root.style.setProperty('--text-secondary', 'rgba(255, 255, 255, 0.7)');
        root.style.setProperty('--text-shadow', '0 4px 12px rgba(0,0,0,0.3)');
        root.style.setProperty('--tile-bg', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--tile-border', 'rgba(255, 255, 255, 0.12)');
        root.style.setProperty('--tile-hover', 'rgba(255, 255, 255, 0.18)');
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
