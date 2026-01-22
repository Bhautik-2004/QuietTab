// settings.js

// Default Preferences matching the user's request
const DEFAULTS = {
    // Legacy
    fontFamily: 'serif',
    contextAware: true,
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

// UI Elements
const tabs = document.querySelectorAll('.nav-btn');
const panels = document.querySelectorAll('.panel');
const statusMsg = document.getElementById('status-message');

// Inputs
const inputs = {
    bgType: document.getElementsByName('bg-type'),
    noiseStrength: document.getElementById('noise-strength'),
    noiseDensity: document.getElementById('noise-density'),
    color1: document.getElementById('color-1'),
    color2: document.getElementById('color-2'),
    color3: document.getElementById('color-3'),
    speed: document.getElementById('speed'),
    fontFamily: document.getElementById('font-family'),
    contextAware: document.getElementById('context-mode'),
    showSeconds: document.getElementById('show-seconds'),
    showDate: document.getElementById('show-date')
};

// Value Displays
const displays = {
    noiseStrength: document.getElementById('val-noise-strength'),
    noiseDensity: document.getElementById('val-noise-density'),
    speed: document.getElementById('val-speed')
};

// 1. Initialize
function init() {
    setupTabs();
    loadSettings();
    setupListeners();
    
    // Explicitly set Shape tab open
    const initialTab = document.querySelector('[data-target="panel-shape"]');
    if (initialTab) {
        // We simulate a click sequence but manually
        initialTab.classList.add('active');
        const shapePanel = document.getElementById('panel-shape');
        shapePanel.classList.add('active');
        setTimeout(() => shapePanel.style.opacity = 1, 50);
    }
}

// 2. Tab Logic
function setupTabs() {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
             const targetId = tab.dataset.target;
             const targetPanel = document.getElementById(targetId);
             
             // If already active, do nothing
             if (tab.classList.contains('active')) return;

            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            // Fade out current panel first
            panels.forEach(p => {
                if(p.classList.contains('active')) {
                    p.style.opacity = 0;
                    setTimeout(() => p.classList.remove('active'), 200);
                }
            });

            // Activate clicked
            tab.classList.add('active');
            
            // Fade in new panel with slight delay for smoothness
            setTimeout(() => {
                targetPanel.classList.add('active');
                // Force reflow
                void targetPanel.offsetWidth;
                targetPanel.style.opacity = 1;
            }, 200);
        });
    });
}

// 3. Load Settings
function loadSettings() {
    chrome.storage.sync.get(DEFAULTS, (items) => {
        // Radio logic
        for (const radio of inputs.bgType) {
            if (radio.value === items.bgType) radio.checked = true;
        }

        // Sliders & Colors
        inputs.noiseStrength.value = items.noiseStrength;
        inputs.noiseDensity.value = items.noiseDensity;
        inputs.speed.value = items.speed;
        
        inputs.color1.value = items.color1;
        inputs.color2.value = items.color2;
        inputs.color3.value = items.color3;

        // Legacy & View
        inputs.fontFamily.value = items.fontFamily;
        inputs.contextAware.checked = items.contextAware;
        inputs.showSeconds.checked = items.showSeconds;
        inputs.showDate.checked = items.showDate;

        updateDisplays();
    });
}

// 4. Update Displays
function updateDisplays() {
    displays.noiseStrength.textContent = inputs.noiseStrength.value;
    displays.noiseDensity.textContent = (inputs.noiseDensity.value / 10).toFixed(1); // Scale for display
    displays.speed.textContent = (inputs.speed.value / 100).toFixed(2);
}

// 5. Save Logic (Debounced)
let saveTimeout;
function saveSettings() {
    clearTimeout(saveTimeout);
    
    // Immediate UI update
    updateDisplays();

    saveTimeout = setTimeout(() => {
        // Get Radio Value
        let selectedType = 'plane';
        for (const radio of inputs.bgType) {
            if (radio.checked) selectedType = radio.value;
        }

        const settings = {
            bgType: selectedType,
            noiseStrength: parseInt(inputs.noiseStrength.value),
            noiseDensity: parseInt(inputs.noiseDensity.value),
            color1: inputs.color1.value,
            color2: inputs.color2.value,
            color3: inputs.color3.value,
            speed: parseInt(inputs.speed.value),
            fontFamily: inputs.fontFamily.value,
            contextAware: inputs.contextAware.checked,
            showSeconds: inputs.showSeconds.checked,
            showDate: inputs.showDate.checked
        };

        chrome.storage.sync.set(settings, () => {
            showStatus('Saved');
        });
    }, 300); // 300ms debounce
}

function showStatus(msg) {
    statusMsg.textContent = msg;
    statusMsg.classList.add('show');
    setTimeout(() => {
        statusMsg.classList.remove('show');
    }, 1500);
}

// 6. Setup Listeners
function setupListeners() {
    // Attach change/input event to all inputs
    inputs.bgType.forEach(r => r.addEventListener('change', saveSettings));
    
    ['noiseStrength', 'noiseDensity', 'speed'].forEach(key => {
        inputs[key].addEventListener('input', saveSettings);
    });

    ['color1', 'color2', 'color3', 'fontFamily', 'showSeconds', 'showDate'].forEach(key => {
        inputs[key].addEventListener('input', saveSettings);
    });

    inputs.contextAware.addEventListener('change', saveSettings);
}

init();
