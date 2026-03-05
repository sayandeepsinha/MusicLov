/**
 * Audio Engine — Persistent hidden BrowserWindow as the audio player
 * 
 * Instead of extracting YouTube audio URLs (which causes 403 errors),
 * this module runs an actual Chromium instance that plays YouTube natively.
 * The renderer sends play/pause/seek commands via IPC; the engine responds
 * with timeupdate, ended, and state events.
 */
const { BrowserWindow, session } = require('electron');

let engineWindow = null;
let mainWindow = null;
let currentVideoId = null;
let pollInterval = null;
let isEngineReady = false;
let adBlockingSetUp = false;

const ENGINE_PARTITION = 'persist:musiclov-engine';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

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

/**
 * Set up network-level ad blocking on the engine session (runs once)
 */
function setupAdBlocking() {
    if (adBlockingSetUp) return;
    adBlockingSetUp = true;

    const ses = session.fromPartition(ENGINE_PARTITION);
    ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
        const url = details.url.toLowerCase();
        const shouldBlock = AD_PATTERNS.some(pattern => url.includes(pattern));
        callback({ cancel: shouldBlock });
    });
}

/**
 * Create or return the persistent hidden BrowserWindow
 */
function getOrCreateWindow() {
    if (engineWindow && !engineWindow.isDestroyed()) {
        return engineWindow;
    }

    // Set up ad blocking before creating the window
    setupAdBlocking();

    engineWindow = new BrowserWindow({
        width: 480,
        height: 360,
        show: false,
        paintWhenInitiallyHidden: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false,
            webSecurity: true,
            partition: ENGINE_PARTITION,
        },
    });

    engineWindow.webContents.setAudioMuted(false);

    engineWindow.on('closed', () => {
        engineWindow = null;
        stopPolling();
    });

    return engineWindow;
}

/**
 * Send an event to the renderer (main window)
 */
function sendToRenderer(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

/**
 * Inject the consent-dialog handler, ad-skipper, and auto-play script.
 * The ad-skipper uses both polling and a MutationObserver for instant response.
 */
async function injectPlayerController(win) {
    try {
        await win.webContents.executeJavaScript(`
            (function() {
                // Persistent intent flag — if false, we won't force play
                window._mlShouldPlay = true;

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

                // === Aggressive Ad Skipper ===
                function skipAds() {
                    // 1. Click any skip button variant
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

                    // 2. Fast-forward any video ad to its end instantly
                    const player = document.querySelector('#movie_player');
                    const isAd = player && player.classList.contains('ad-showing');
                    if (isAd) {
                        const v = document.querySelector('video');
                        if (v && v.duration && isFinite(v.duration) && v.duration > 0) {
                            v.currentTime = v.duration;
                            v.playbackRate = 16;
                        }
                    }

                    // 3. Close overlay/banner ads
                    ['.ytp-ad-overlay-close-button', '.ytp-ad-overlay-close-container', 'button[id="dismiss-button"]'].forEach(sel => {
                        const btn = document.querySelector(sel);
                        if (btn) btn.click();
                    });

                    // 4. Remove ad DOM elements
                    document.querySelectorAll('.ytp-ad-module, .ytp-ad-image-overlay, .ytp-ad-text-overlay, .video-ads, .ytp-ad-overlay-container').forEach(el => el.remove());
                }

                // === Auto-Play Logic ===
                function forcePlay() {
                    handleConsent();

                    const player = document.querySelector('#movie_player');
                    if (player && player.classList.contains('ad-showing')) {
                        skipAds();
                        return;
                    }

                    if (!window._mlShouldPlay) return;

                    const video = document.querySelector('video');
                    if (video) {
                        video.muted = false;
                        if (video.paused) video.play().catch(() => {});
                    }

                    const playBtn = document.querySelector('.ytp-play-button');
                    if (playBtn) {
                        const label = playBtn.getAttribute('aria-label') || '';
                        if (label.includes('Play')) playBtn.click();
                    }
                }

                // === MutationObserver for instant ad detection ===
                const player = document.querySelector('#movie_player');
                if (player) {
                    new MutationObserver(() => {
                        if (player.classList.contains('ad-showing')) skipAds();
                    }).observe(player, { attributes: true, attributeFilter: ['class'] });
                }

                // === Native Autoplay Disabler ===
                function disableAutoplay() {
                    try {
                        const player = document.querySelector('#movie_player');
                        if (player && typeof player.setAutonav === 'function') {
                            player.setAutonav(false);
                        }
                        
                        // Also try the visual toggle if found
                        const autonavToggle = document.querySelector('.ytp-autonav-toggle-button');
                        if (autonavToggle && autonavToggle.getAttribute('aria-checked') === 'true') {
                            autonavToggle.click();
                        }

                        // Block next-button clicks from YouTube itself
                        const nextBtn = document.querySelector('.ytp-next-button');
                        if (nextBtn) nextBtn.style.display = 'none';
                    } catch (e) {}
                }

                // Poll every 300ms as fallback
                setInterval(() => { 
                    skipAds(); 
                    forcePlay(); 
                    disableAutoplay();
                }, 300);
                
                handleConsent();
                skipAds();
                forcePlay();
                disableAutoplay();
            })();
        `);
    } catch (e) {
        // Ignore — window may be mid-navigation
    }
}

/**
 * Poll the hidden window's <video> element for state updates.
 * Distinguishes between ad playback and actual content.
 * Uses adaptive polling (slow when paused, faster when playing).
 */
function startPolling() {
    stopPolling();

    const poll = async () => {
        if (!engineWindow || engineWindow.isDestroyed()) {
            stopPolling();
            return;
        }

        let nextPollDelay = 500; // Default: playing

        try {
            const state = await engineWindow.webContents.executeJavaScript(`
                (function() {
                    const v = document.querySelector('video');
                    if (!v) return null;
                    const player = document.querySelector('#movie_player');
                    const isAd = player && player.classList.contains('ad-showing');
                    return {
                        currentTime: v.currentTime || 0,
                        duration: v.duration || 0,
                        paused: v.paused,
                        ended: v.ended,
                        readyState: v.readyState,
                        volume: v.volume,
                        muted: v.muted,
                        isAd: isAd,
                    };
                })();
            `);

            if (state) {
                if (!state.isAd) {
                    const duration = (isNaN(state.duration) || !isFinite(state.duration)) ? 0 : state.duration;

                    sendToRenderer('engine:timeupdate', {
                        currentTime: state.currentTime,
                        duration: duration,
                        paused: state.paused,
                        volume: state.volume,
                    });

                    if (state.ended) {
                        sendToRenderer('engine:ended', { videoId: currentVideoId });
                    }

                    if (!isEngineReady && state.readyState >= 2 && duration > 0) {
                        isEngineReady = true;
                        console.log(`[AudioEngine] Ready: duration=${duration.toFixed(1)}s`);
                        sendToRenderer('engine:ready', {
                            videoId: currentVideoId,
                            duration: duration,
                        });
                    }

                    // Adaptive polling: Slow down if paused
                    if (state.paused) nextPollDelay = 1500;
                } else {
                    // Poll faster during ads to catch the skip better
                    nextPollDelay = 300;
                }
            }
        } catch (e) {
            // Window may be navigating, silent ignore
        }

        pollInterval = setTimeout(poll, nextPollDelay);
    };

    poll();
}

function stopPolling() {
    if (pollInterval) {
        clearTimeout(pollInterval);
        pollInterval = null;
    }
}

// ============ PUBLIC API ============

function init(mainWin) {
    mainWindow = mainWin;
    console.log('[AudioEngine] Initialized');
}

async function play(videoId) {
    console.log(`[AudioEngine] Playing: ${videoId}`);
    currentVideoId = videoId;
    isEngineReady = false;

    const win = getOrCreateWindow();
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    sendToRenderer('engine:loading', { videoId });

    try {
        await win.loadURL(url, { userAgent: USER_AGENT });
        await injectPlayerController(win);
        startPolling();
    } catch (err) {
        if (err.code !== 'ERR_ABORTED') {
            console.error('[AudioEngine] Load error:', err.message);
            sendToRenderer('engine:error', { videoId, error: err.message });
        }
    }
}

async function pause() {
    if (!engineWindow || engineWindow.isDestroyed()) return;
    try {
        await engineWindow.webContents.executeJavaScript(`
            (function() { 
                window._mlShouldPlay = false;
                const v = document.querySelector('video'); 
                if (v) v.pause(); 
            })();
        `);
    } catch (e) { /* ignore */ }
}

async function resume() {
    if (!engineWindow || engineWindow.isDestroyed()) return;
    try {
        await engineWindow.webContents.executeJavaScript(`
            (function() { 
                window._mlShouldPlay = true;
                const v = document.querySelector('video'); 
                if (v) v.play().catch(() => {}); 
            })();
        `);
    } catch (e) { /* ignore */ }
}

async function seek(timeSeconds) {
    if (!engineWindow || engineWindow.isDestroyed()) return;
    try {
        await engineWindow.webContents.executeJavaScript(`
            (function() { const v = document.querySelector('video'); if (v) v.currentTime = ${timeSeconds}; })();
        `);
    } catch (e) { /* ignore */ }
}

async function setVolume(volume) {
    if (!engineWindow || engineWindow.isDestroyed()) return;
    try {
        await engineWindow.webContents.executeJavaScript(`
            (function() { const v = document.querySelector('video'); if (v) { v.volume = ${volume}; v.muted = false; } })();
        `);
    } catch (e) { /* ignore */ }
}

async function setMuted(muted) {
    if (!engineWindow || engineWindow.isDestroyed()) return;
    try {
        await engineWindow.webContents.executeJavaScript(`
            (function() { const v = document.querySelector('video'); if (v) v.muted = ${muted}; })();
        `);
    } catch (e) { /* ignore */ }
}

async function stop() {
    console.log('[AudioEngine] Stopping (Nuclear)');
    stopPolling();
    currentVideoId = null;
    isEngineReady = false;

    if (engineWindow && !engineWindow.isDestroyed()) {
        try {
            // First pause and clear intent
            await engineWindow.webContents.executeJavaScript(`
                (function() { 
                    window._mlShouldPlay = false;
                    const v = document.querySelector('video'); 
                    if (v) { v.pause(); v.src = ''; } 
                })();
            `);
            // THEN navigate away to completely unload YouTube JS context
            await engineWindow.loadURL('about:blank');
        } catch (e) { /* ignore */ }
    }
}

function getSession() {
    return session.fromPartition(ENGINE_PARTITION);
}

function destroy() {
    stopPolling();
    if (engineWindow && !engineWindow.isDestroyed()) {
        engineWindow.destroy();
        engineWindow = null;
    }
}

module.exports = {
    init,
    play,
    pause,
    resume,
    seek,
    setVolume,
    setMuted,
    stop,
    getSession,
    destroy,
    ENGINE_PARTITION,
};
