/**
 * enginePreload.js
 * 
 * Specialized preload script for the hidden background engine window.
 * 
 * CRITICAL: This script runs BEFORE YouTube loads. 
 * Its only job is to completely disable the MediaSession API so that 
 * the background window NEVER competes with the renderer UI for 
 * hardware media keys (Play/Pause/Next/Prev).
 */

try {
    // Completely kill the MediaSession API in this window
    Object.defineProperty(navigator, 'mediaSession', {
        value: null,
        writable: false,
        configurable: false
    });
} catch (e) {
    // ignore
}
