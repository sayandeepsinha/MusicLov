/**
 * Ad Blocker Module
 *
 * Standalone module for all ad-blocking logic. Extracted from audioEngine.js
 * so it can be improved independently or swapped for a library in the future.
 *
 * Exports:
 *   - setupAdBlocking(session)  : Sets up network-level blocking on a given Electron session
 *   - getAdSkipperScript()      : Returns the injected JS string for in-page ad skipping
 */

const logger = require('./logger');

// Comprehensive list of ad-related URL patterns to block at the network level
const AD_PATTERNS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'google-analytics.com', 'googletagmanager.com', 'googletagservices.com',
    'securepubads.g.doubleclick.net', 'pagead2.googlesyndication.com',
    'adservice.google.com', 'ad.youtube.com',
    '/pagead/', '/ad_status', '/api/stats/ads', '/ptracking',
    '/get_midroll', '/log_interaction',
    'youtube.com/pagead', 'youtube.com/api/stats/ads',
    'youtube.com/get_midroll', 'youtube.com/ptracking',
    'play.google.com/log', 'csi.gstatic.com',
    '/ads/', '&ad_type=', '&adurl=',
    'innovid.com', 'aniview.com', 'serving-sys.com',
    'moatads.com', 'imasdk.googleapis.com',
];

let adBlockingSetUp = false;

/**
 * Set up network-level ad blocking on the given Electron session.
 * Safe to call multiple times — runs only once.
 *
 * @param {Electron.Session} ses - The session to apply blocking to
 */
function setupAdBlocking(ses) {
    if (adBlockingSetUp) return;
    adBlockingSetUp = true;

    ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
        const url = details.url.toLowerCase();
        const shouldBlock = AD_PATTERNS.some(pattern => url.includes(pattern));
        if (shouldBlock) {
            logger.info('AdBlocker', `Blocked: ${details.url.substring(0, 80)}`);
        }
        callback({ cancel: shouldBlock });
    });

    logger.info('AdBlocker', 'Network-level ad blocking enabled');
}

/**
 * Returns the JavaScript string to be injected into the engine window.
 *
 * Strategy for fast startup:
 *   - Runs immediately at injection time (dom-ready, before full page load)
 *   - Uses a fast 100ms interval for the first 8 seconds, then relaxes to 600ms
 *   - Skips ad DOM elements, fast-forwards video ads, handles consent dialogs
 *   - Does NOT call forcePlay in the interval — forcePlay is one-shot on load
 *
 * Intentionally does NOT include a persistent forcePlay polling loop.
 */
function getAdSkipperScript() {
    return `
(function() {
    if (window.__mlAdBlockerRunning) return;
    window.__mlAdBlockerRunning = true;

    // === Consent Dialog Handler ===
    function handleConsent() {
        const selectors = [
            'button[aria-label*="Accept"]',
            'button[aria-label*="Agree"]',
            '.yt-spec-button-shape-next--filled',
            'button.yt-spec-button-shape-next',
            '#confirm-button'
        ];
        for (const sel of selectors) {
            document.querySelectorAll(sel).forEach(btn => {
                const t = (btn.innerText || '').toLowerCase();
                if (t.includes('accept') || t.includes('agree') || t.includes('allow')) btn.click();
            });
        }
    }

    // === Ad Skipper ===
    function skipAds() {
        // 1. Click any visible skip button immediately
        const skipSelectors = [
            '.ytp-skip-ad-button',
            '.ytp-ad-skip-button',
            '.ytp-ad-skip-button-modern',
            '.ytp-ad-skip-button-slot button',
            '.ytp-ad-skip-button-container button',
            '[id^="skip-button"]',
            'button.ytp-ad-skip-button-modern',
            '.videoAdUiSkipButton',
        ];
        for (const sel of skipSelectors) {
            const btn = document.querySelector(sel);
            if (btn) { btn.click(); return; }
        }

        // 2. Fast-forward video ads to their very end
        const player = document.querySelector('#movie_player');
        const isAd = player && player.classList.contains('ad-showing');
        if (isAd) {
            const v = document.querySelector('video');
            if (v && v.duration && isFinite(v.duration) && v.duration > 0) {
                // Seek past the end to force the ad to end
                v.currentTime = v.duration + 1;
                v.playbackRate = 16;
            }
        }

        // 3. Close overlay/banner ads — non-bubbling to avoid triggering player
        ['.ytp-ad-overlay-close-button', '.ytp-ad-overlay-close-container', 'button[id="dismiss-button"]'].forEach(sel => {
            const btn = document.querySelector(sel);
            if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: false }));
        });

        // 4. Hide ad DOM elements (don't remove — removal can emit side-effect events)
        document.querySelectorAll(
            '.ytp-ad-module, .ytp-ad-image-overlay, .ytp-ad-text-overlay, .video-ads, .ytp-ad-overlay-container'
        ).forEach(el => { el.style.display = 'none'; });
    }

    // === Autonav Disabler ===
    function disableAutoplay() {
        try {
            const player = document.querySelector('#movie_player');
            if (player && typeof player.setAutonav === 'function') player.setAutonav(false);
            const toggle = document.querySelector('.ytp-autonav-toggle-button');
            if (toggle && toggle.getAttribute('aria-checked') === 'true') toggle.click();
            const nextBtn = document.querySelector('.ytp-next-button');
            if (nextBtn) nextBtn.style.display = 'none';
        } catch (e) {}
    }

    // === MutationObserver for instant ad detection on class change ===
    const playerEl = document.querySelector('#movie_player');
    if (playerEl) {
        new MutationObserver(() => {
            if (playerEl.classList.contains('ad-showing')) skipAds();
        }).observe(playerEl, { attributes: true, attributeFilter: ['class'] });
    }

    // === Initial run ===
    handleConsent();
    skipAds();
    disableAutoplay();

    // === Fast interval for first 8 seconds (catches early ads quickly) ===
    let fastRuns = 0;
    const fastInterval = setInterval(() => {
        skipAds();
        handleConsent();
        fastRuns++;
        if (fastRuns >= 80) { // 80 * 100ms = 8 seconds
            clearInterval(fastInterval);
            // Slow interval after warmup
            setInterval(() => { skipAds(); disableAutoplay(); }, 600);
        }
    }, 100);
})();
`;
}

module.exports = { setupAdBlocking, getAdSkipperScript, AD_PATTERNS };
