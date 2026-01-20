// background.js

const DEFAULT_SETTINGS = {
  current_context_category: 'general',
  theme: 'light',
  quote_frequency: 'always'
};

const CATEGORY_BADGES = {
  productivity: { text: 'PROD', color: '#4CAF50' },
  coding: { text: 'CODE', color: '#2196F3' },
  creative: { text: 'ART', color: '#9C27B0' },
  learning: { text: 'LEARN', color: '#FF9800' },
  wellbeing: { text: 'ZEN', color: '#00BCD4' },
  general: { text: '', color: '#000000' }
};

// 1. Lifecycle Events
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[Quiet Quotes] Extension installed/updated: ${details.reason}`);
  
  // Initialize default storage if missing
  chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (result) => {
    const missingKeys = {};
    let needsUpdate = false;
    
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (result[key] === undefined) {
        missingKeys[key] = value;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      chrome.storage.local.set(missingKeys, () => {
        console.log('[Quiet Quotes] Default settings initialized');
      });
    }
  });
});

// 2. Storage Listener & Coordination
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.current_context_category) {
    const newCategory = changes.current_context_category.newValue;
    console.log(`[Quiet Quotes] Context changed to: ${newCategory}`);
    
    updateBadge(newCategory);
  }
});

// 3. Helper: Update Extension Badge
function updateBadge(category) {
  const badge = CATEGORY_BADGES[category] || CATEGORY_BADGES.general;
  
  // We can't set badge color easily in MV3 without an action in manifest, 
  // but we can set text if the action exists. Assuming 'action' or 'browser_action' is set implicitly or explicitly.
  // Ideally, we'd check manifest, but this is safe to try.
  
  chrome.action.setBadgeText({ text: badge.text });
  chrome.action.setBadgeBackgroundColor({ color: badge.color });
}

// 4. Message Handling (Optional coordination)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CONTEXT') {
    chrome.storage.local.get('current_context_category', (data) => {
      sendResponse({ category: data.current_context_category || 'general' });
    });
    return true; // Keep channel open for async response
  }
});
