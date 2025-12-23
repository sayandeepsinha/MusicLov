/**
 * Linux Platform Module
 * Platform-specific paths and configurations for Linux
 */

const path = require('path');
const os = require('os');
const { app } = require('electron');

/**
 * Get the default music directory path for Linux
 */
function getDefaultMusicPath() {
    return path.join(os.homedir(), 'Music');
}

/**
 * Get the path to the yt-dlp binary for Linux
 */
function getYtdlpPath() {
    const isDev = !app.isPackaged;
    if (isDev) {
        return path.join(__dirname, '../../../binaries/yt-dlp');
    }
    return path.join(process.resourcesPath, 'binaries/yt-dlp');
}

/**
 * Window configuration for Linux
 */
const windowConfig = {
    frame: true,  // Standard window frame on Linux
};

module.exports = {
    platform: 'linux',
    getDefaultMusicPath,
    getYtdlpPath,
    windowConfig,
};
