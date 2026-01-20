// settings.js

// Default Preferences
const DEFAULTS = {
    fontFamily: 'serif',
    fontSize: 'l',
    contextAware: true
};

// Elements
const fontSelect = document.getElementById('font-family');
const contextToggle = document.getElementById('context-mode');
const saveBtn = document.getElementById('save-btn');
const statusEl = document.getElementById('status');
const sizeRadios = document.getElementsByName('font-size');

// 1. Load Settings
function loadSettings() {
    chrome.storage.sync.get(DEFAULTS, (items) => {
        fontSelect.value = items.fontFamily;
        contextToggle.checked = items.contextAware;
        
        // select radio
        for (const radio of sizeRadios) {
            if (radio.value === items.fontSize) {
                radio.checked = true;
                break;
            }
        }
    });
}

// 2. Save Settings
function saveSettings() {
    // get selected radio
    let selectedSize = 'l';
    for (const radio of sizeRadios) {
        if (radio.checked) {
            selectedSize = radio.value;
            break;
        }
    }

    const settings = {
        fontFamily: fontSelect.value,
        fontSize: selectedSize,
        contextAware: contextToggle.checked
    };

    chrome.storage.sync.set(settings, () => {
        // Show status feedback
        statusEl.style.opacity = 1;
        
        // Notify other tabs (New Tab Page) of changes immediately
        // Note: New Tab page usually reloads or can listen to storage changes
        
        setTimeout(() => {
            statusEl.style.opacity = 0;
        }, 1500);
    });
}

// 3. Live Preview / Instant Apply (Optional - for New Tab to pick up)
// We are saving to storage, and relying on storage listener in New Tab for "Live" effect
// or simple page reload on save.

document.addEventListener('DOMContentLoaded', loadSettings);
saveBtn.addEventListener('click', saveSettings);
