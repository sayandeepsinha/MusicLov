/**
 * Common Constants
 * Shared constants used across all services
 */

// Supported audio file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.flac', '.ogg', '.aac', '.wma', '.opus'];

// MIME types for audio files
const MIME_TYPES = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.aac': 'audio/aac',
    '.wma': 'audio/x-ms-wma',
    '.opus': 'audio/opus',
};

// Directories to ignore when scanning for music
const IGNORED_DIRS = [
    '.git',
    'node_modules',
    '.Trash',
    'Network Trash Folder',
    'Temporary Items',
    'desktop.ini',
];

module.exports = {
    AUDIO_EXTENSIONS,
    MIME_TYPES,
    IGNORED_DIRS,
};
