/**
 * macOS (darwin) Platform Module
 * Platform-specific paths and configurations for macOS
 */

const path = require('path');
const os = require('os');
const { app } = require('electron');

/**
 * Get the default music directory path for macOS
 */
function getDefaultMusicPath() {
    return path.join(os.homedir(), 'Music');
}

/**
 * Get the path to the yt-dlp binary for macOS
 */
function getYtdlpPath() {
    const isDev = !app.isPackaged;
    if (isDev) {
        return path.join(__dirname, '../../../binaries/yt-dlp');
    }
    return path.join(process.resourcesPath, 'binaries/yt-dlp');
}

/**
 * Window configuration for macOS
 */
const windowConfig = {
    titleBarStyle: 'hiddenInset',
};

module.exports = {
    platform: 'darwin',
    getDefaultMusicPath,
    getYtdlpPath,
    windowConfig,
};
