/**
 * Platform Configuration & Constants
 */
const path = require('path');
const os = require('os');
const { app } = require('electron');

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.flac', '.ogg', '.aac', '.wma', '.opus', '.webm'];

const MIME_TYPES = {
    '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.mp4': 'audio/mp4',
    '.wav': 'audio/wav', '.flac': 'audio/flac', '.ogg': 'audio/ogg',
    '.aac': 'audio/aac', '.wma': 'audio/x-ms-wma', '.opus': 'audio/opus',
    '.webm': 'audio/webm',
};

const IGNORED_DIRS = ['.git', 'node_modules', '.Trash', 'Network Trash Folder', 'Temporary Items', 'desktop.ini'];

const platform = process.platform;

const getDefaultMusicPath = () => path.join(os.homedir(), 'Music');

const getWindowConfig = () => {
    if (platform === 'darwin') return { titleBarStyle: 'hiddenInset' };
    if (platform === 'win32') return { frame: false };
    return { frame: true };
};

module.exports = {
    AUDIO_EXTENSIONS, MIME_TYPES, IGNORED_DIRS,
    platform, getDefaultMusicPath, getWindowConfig,
};
