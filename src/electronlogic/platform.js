/**
 * Platform Configuration
 * Single file handling all platform-specific logic
 */

const path = require('path');
const os = require('os');
const { app } = require('electron');

const platform = process.platform;

/**
 * Get the default music directory path
 * Same for all platforms: ~/Music
 */
function getDefaultMusicPath() {
    return path.join(os.homedir(), 'Music');
}

/**
 * Get the path to the yt-dlp binary
 * Handles platform-specific binary names and paths
 */
function getYtdlpPath() {
    const binaryName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const isDev = !app.isPackaged;

    if (isDev) {
        return path.join(__dirname, '../../binaries', binaryName);
    }
    return path.join(process.resourcesPath, 'binaries', binaryName);
}

/**
 * Get platform-specific window configuration
 */
function getWindowConfig() {
    switch (platform) {
        case 'darwin':
            return { titleBarStyle: 'hiddenInset' };
        case 'win32':
            return { frame: false }; // Custom title bar on Windows
        default:
            return { frame: true };  // Standard frame on Linux
    }
}

module.exports = {
    platform,
    getDefaultMusicPath,
    getYtdlpPath,
    getWindowConfig,
};
