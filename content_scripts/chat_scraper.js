// chat_scraper.js

(() => {
    const CONFIG = {
        scanInterval: 1500, // Check slightly more often
        debounceSave: 1000, // Faster save (1s) for better responsiveness
        maxMessagesToScan: 10,
        sites: {
            chatgpt: {
                check: () => window.location.hostname.includes('chatgpt.com'),
                selector: '[data-message-author-role="user"] > div, [data-message-author-role="assistant"] .markdown',
            },
            claude: {
                check: () => window.location.hostname.includes('claude.ai'),
                selector: '.font-user-message, .font-claude-message',
            },
            gemini: {
                check: () => window.location.hostname.includes('gemini.google.com'),
                selector: 'user-query, model-response', // Approximate selectors
            }
        },
        keywords: {
            productivity: ['plan', 'schedule', 'list', 'organize', 'task', 'mail', 'calendar', 'time', 'efficient'],
            coding: ['javascript', 'python', 'react', 'code', 'function', 'bug', 'error', 'api', 'database', 'variable', 'class', 'method'],
            creative: ['write', 'story', 'poem', 'idea', 'design', 'color', 'imagine', 'create', 'art', 'music'],
            learning: ['explain', 'what is', 'how to', 'history', 'science', 'math', 'study', 'learn', 'understand', 'theory'],
            wellbeing: ['stress', 'relax', 'meditate', 'feeling', 'emotion', 'health', 'sleep', 'exercise', 'anxiety']
        }
    };

    let currentSite = null;
    let observer = null;
    let saveTimeout = null;
    let lastProcessedText = '';

    // --- DEBUGGING HELPER ---
    function showDebugToast(category, textSnippet) {
        // Debugging disabled for production
        // const id = 'quiet-quotes-debug-toast';
        // ... implementation removed ...
    }

    // 1. Detect Site & Selectors (Improved)
    function detectSite() {
        const host = window.location.hostname;
        
        if (host.includes('chatgpt.com') || host.includes('openai.com') || host.includes('chat.com')) {
            return { 
                name: 'ChatGPT',
                // Primary: Data attributes. Fallback: Specific classes used by ChatGPT
                selector: '[data-message-author-role="user"], .text-message' 
            };
        }
        if (host.includes('claude.ai')) {
            return { 
                name: 'Claude',
                selector: '.font-user-message' 
            };
        }
        if (host.includes('gemini.google.com')) {
            return { 
                name: 'Gemini',
                selector: '.user-query, [data-user-query]' 
            };
        }
        return null;
    }

    // 2. Extract Text
    function getRecentChatText() {
        if (!currentSite) return '';

        let elements = Array.from(document.querySelectorAll(currentSite.selector));
        
        // --- FALLBACK STRATEGY (The "Nuclear" Option) ---
        // If specific selectors fail, try to find *any* substantial text blocks likely to be chat
        if (elements.length === 0) {
            console.warn('[Quiet Quotes] Primary selectors failed. Trying fallbacks...');
            
            if (currentSite.name === 'ChatGPT') {
                // Common ChatGPT text containers
                elements = Array.from(document.querySelectorAll('.text-base, .markdown, .whitespace-pre-wrap'));
            } else {
                // Generic fallback for others
                elements = Array.from(document.querySelectorAll('p, .prose'));
            }
        }

        const recentElements = elements.slice(-CONFIG.maxMessagesToScan);
        return recentElements.map(el => el.innerText).join(' ').toLowerCase();
    }

    // 3. Analyze Content
    function analyzeCategory(text) {
        if (!text || text.length < 10) return 'general';

        const scores = {};
        let maxScore = 0;
        let bestCategory = 'general';

        for (const [category, terms] of Object.entries(CONFIG.keywords)) {
            scores[category] = 0;
            terms.forEach(term => {
                const regex = new RegExp(`\\b${term}\\b`, 'gi');
                const count = (text.match(regex) || []).length;
                scores[category] += count;
            });

            if (scores[category] > maxScore) {
                maxScore = scores[category];
                bestCategory = category;
            }
        }
        
        // Debug scoring
        console.log('[Quiet Quotes] Scores:', scores, 'Best:', bestCategory);
        
        return maxScore > 0 ? bestCategory : 'general';
    }

    // 4. Save Category (Debounced)
    function scheduleSave(category) {
        if (saveTimeout) clearTimeout(saveTimeout);
        
        saveTimeout = setTimeout(() => {
            chrome.storage.local.set({ 'current_context_category': category }, () => {
                // console.log(`[Quiet Quotes] Saved category: ${category}`); 
            });
        }, CONFIG.debounceSave);
    }

    // 5. Main Processing Loop
    function processChat() {
        const text = getRecentChatText();
        
        // If empty, logging for debug
        if (!text) {
            // console.log('[Quiet Quotes] No text extracted yet.');
            return;
        }

        // Simple check to avoid re-processing identical text
        if (text === lastProcessedText) return;
        lastProcessedText = text;

        const category = analyzeCategory(text);
        
        // SHOW DEBUG TOAST
        showDebugToast(category, text.substring(0, 30) + '...');
        
        scheduleSave(category);
    }

    // 6. Setup Observer
    function init() {
        currentSite = detectSite();
        if (!currentSite) {
            console.log('[Quiet Quotes] Site not supported or not detected:', window.location.hostname);
            return;
        }
        
        console.log(`[Quiet Quotes] Hooked into ${currentSite.name}`);
        showDebugToast('Initialized', `Monitoring ${currentSite.name}`);

        // Run immediately once
        processChat();

        // Observe DOM for changes
        let processTimeout;
        observer = new MutationObserver((mutations) => {
            if (processTimeout) return;
            processTimeout = setTimeout(() => {
                processChat();
                processTimeout = null;
            }, CONFIG.scanInterval);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Handle SPA navigation/URL changes if necessary (though MutationObserver usually catches content changes)
    let lastUrl = location.href; 
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            // Re-detect site or reset if needed on navigation
            processChat();
        }
    }).observe(document, {subtree: true, childList: true});

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();