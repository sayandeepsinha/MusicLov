/**
 * Audio Engine — Persistent hidden BrowserWindow as the audio player
 *
 * Architecture:
 *  - engine:timeupdate  → { currentTime, duration }  (progress only, never touches isPlaying)
 *  - engine:ready       → { duration }                (song loaded and started)
 *  - engine:loading     → { videoId }                 (navigation started)
 *  - engine:ended       → { videoId }                 (song finished)
 *  - engine:error       → { error }                   (something failed)
 *  - getState()         → current engine state        (used for UI sync on reload)
 */
const { BrowserWindow, session } = require('electron');
const logger = require('./logger');

let engineWindow = null;
let mainWindow = null;
let currentVideoId = null;
let pollTimer = null;
let isEngineReady = false;
let isEnginePlaying = false; // engine's actual play state (tracked internally)
let engineCurrentTime = 0;
let engineDuration = 0;

const ENGINE_PARTITION = 'persist:musiclov-engine';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const POLL_MS_PLAYING = 500;
const POLL_MS_PAUSED = 1000;

function getOrCreateWindow() {
    if (engineWindow && !engineWindow.isDestroyed()) return engineWindow;

    engineWindow = new BrowserWindow({
        width: 480, height: 360,
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
    engineWindow.on('closed', () => { engineWindow = null; stopPoll(); });
    return engineWindow;
}

function send(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

/** Keep UI progress bar smooth. Never sends isPlaying — UI owns that. */
function startPoll() {
    stopPoll();

    const tick = async () => {
        if (!engineWindow || engineWindow.isDestroyed()) return;

        try {
            const state = await engineWindow.webContents.executeJavaScript(`
                (function() {
                    const v = document.querySelector('video');
                    if (!v) return null;
                    return {
                        currentTime: v.currentTime || 0,
                        duration: isFinite(v.duration) ? v.duration : 0,
                        paused: v.paused,
                        ended: v.ended,
                        readyState: v.readyState,
                    };
                })();
            `);

            if (!state) {
                pollTimer = setTimeout(tick, POLL_MS_PAUSED);
                return;
            }

            // Update internal tracking
            engineCurrentTime = state.currentTime;
            if (state.duration > 0) engineDuration = state.duration;
            isEnginePlaying = !state.paused;

            // Send progress-only update to UI
            send('engine:timeupdate', {
                currentTime: state.currentTime,
                duration: engineDuration,
            });

            // Song ended → stop poll, notify UI
            if (state.ended) {
                stopPoll();
                send('engine:ended', { videoId: currentVideoId });
                return;
            }

            // First time we detect the song is actually playing with valid duration
            if (!isEngineReady && state.readyState >= 2 && engineDuration > 0 && !state.paused) {
                isEngineReady = true;
                logger.info('AudioEngine', `Ready: duration=${engineDuration.toFixed(1)}s`);
                send('engine:ready', { videoId: currentVideoId, duration: engineDuration });
            }

            pollTimer = setTimeout(tick, state.paused ? POLL_MS_PAUSED : POLL_MS_PLAYING);
        } catch (_) {
            // Window navigating — retry shortly
            pollTimer = setTimeout(tick, POLL_MS_PAUSED);
        }
    };

    tick();
}

function stopPoll() {
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
}

// ─── Inject minimal play-intent JS after page load ───────────────────────────
async function injectPlayIntent(win) {
    try {
        await win.webContents.executeJavaScript(`
            (function() {
                if (window._mlInstalled) return;
                window._mlInstalled = true;
                window._mlShouldPlay = true;
                function tryPlay() {
                    const player = document.querySelector('#movie_player');
                    if (player && player.classList.contains('ad-showing')) return;
                    if (!window._mlShouldPlay) return;
                    const v = document.querySelector('video');
                    if (v && v.paused) v.play().catch(() => {});
                }
                tryPlay();
                window._mlTryPlay = tryPlay;
            })();
        `);
    } catch (_) { /* navigating */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

function init(mainWin) {
    mainWindow = mainWin;
    logger.info('AudioEngine', 'Initialized');
}

async function play(videoId) {
    logger.info('AudioEngine', `Playing: ${videoId}`);
    currentVideoId = videoId;
    isEngineReady = false;
    isEnginePlaying = false;
    engineCurrentTime = 0;
    engineDuration = 0;
    stopPoll();

    const win = getOrCreateWindow();
    send('engine:loading', { videoId });

    try {
        await win.loadURL(`https://www.youtube.com/watch?v=${videoId}`, { userAgent: USER_AGENT });
        await injectPlayIntent(win);
        startPoll();
    } catch (err) {
        if (err.code !== 'ERR_ABORTED') {
            logger.error('AudioEngine', 'Load error', err.message);
            send('engine:error', { error: err.message });
        }
    }
}

async function pause() {
    isEnginePlaying = false;
    if (!engineWindow || engineWindow.isDestroyed()) return;
    try {
        await engineWindow.webContents.executeJavaScript(`
            (function() { window._mlShouldPlay = false; const v = document.querySelector('video'); if (v) v.pause(); })();
        `);
    } catch (_) { }
}

async function resume() {
    isEnginePlaying = true;
    if (!engineWindow || engineWindow.isDestroyed()) return;
    try {
        await engineWindow.webContents.executeJavaScript(`
            (function() { window._mlShouldPlay = true; const v = document.querySelector('video'); if (v) v.play().catch(() => {}); })();
        `);
    } catch (_) { }
}

async function seek(timeSeconds) {
    engineCurrentTime = timeSeconds;
    if (!engineWindow || engineWindow.isDestroyed()) return;
    try {
        await engineWindow.webContents.executeJavaScript(`
            (function() {
                const v = document.querySelector('video');
                if (!v) return;
                v.currentTime = ${timeSeconds};
                if (window._mlShouldPlay && v.paused) v.play().catch(() => {});
            })();
        `);
    } catch (_) { }
}

async function setVolume(volume) {
    if (!engineWindow || engineWindow.isDestroyed()) return;
    try { await engineWindow.webContents.executeJavaScript(`(function(){const v=document.querySelector('video');if(v){v.volume=${volume};v.muted=false;}})();`); } catch (_) { }
}

async function setMuted(muted) {
    if (!engineWindow || engineWindow.isDestroyed()) return;
    try { await engineWindow.webContents.executeJavaScript(`(function(){const v=document.querySelector('video');if(v)v.muted=${muted};})();`); } catch (_) { }
}

async function stop() {
    logger.info('AudioEngine', 'Stopping');
    stopPoll();
    currentVideoId = null;
    isEngineReady = false;
    isEnginePlaying = false;
    engineCurrentTime = 0;
    engineDuration = 0;
    if (engineWindow && !engineWindow.isDestroyed()) {
        try {
            await engineWindow.webContents.executeJavaScript(
                `(function(){window._mlShouldPlay=false;window._mlInstalled=false;const v=document.querySelector('video');if(v){v.pause();v.src='';}})();`
            );
            await engineWindow.loadURL('about:blank');
        } catch (_) { }
    }
}

/** Called by renderer on mount to sync UI state after HMR reload */
function getState() {
    return {
        videoId: currentVideoId,
        isPlaying: isEnginePlaying,
        currentTime: engineCurrentTime,
        duration: engineDuration,
        isReady: isEngineReady,
    };
}

function getSession() { return session.fromPartition(ENGINE_PARTITION); }

function destroy() {
    stopPoll();
    if (engineWindow && !engineWindow.isDestroyed()) { engineWindow.destroy(); engineWindow = null; }
}

module.exports = { init, play, pause, resume, seek, setVolume, setMuted, stop, getState, getSession, destroy, ENGINE_PARTITION };
