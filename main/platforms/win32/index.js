/**
 * Windows (win32) Platform Module
 * Platform-specific paths and configurations for Windows
 */

const path = require('path');
const os = require('os');
const { app } = require('electron');

/**
 * Get the default music directory path for Windows
 */
function getDefaultMusicPath() {
    return path.join(os.homedir(), 'Music');
}

/**
 * Get the path to the yt-dlp binary for Windows
 */
function getYtdlpPath() {
    const isDev = !app.isPackaged;
    if (isDev) {
        return path.join(__dirname, '../../../binaries/yt-dlp.exe');
    }
    return path.join(process.resourcesPath, 'binaries/yt-dlp.exe');
}

/**
 * Window configuration for Windows
 */
const windowConfig = {
    frame: false,  // Custom title bar on Windows
};

module.exports = {
    platform: 'win32',
    getDefaultMusicPath,
    getYtdlpPath,
    windowConfig,
};
