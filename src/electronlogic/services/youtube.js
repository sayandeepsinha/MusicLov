/**
 * YouTube Service
 * Handles download-related helpers using the engine's authenticated session.
 * Note: active downloading is not yet implemented (stub only).
 */
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const logger = require('./logger');

/**
 * Download a song by videoId.
 * Feature is currently a stub — not implemented.
 */
const downloadSong = async (videoId, title, metadata = {}) => {
    logger.info('YouTube', `Download requested for ${videoId} (feature not yet implemented)`);
    return null;
};

/** Check if a song is already downloaded to disk */
const isAlreadyDownloaded = (videoId, songInfo) => {
    const sanitize = (name) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
    const downloadsPath = path.join(app.getPath('music'), 'MusicLov');
    const filename = sanitize(`${songInfo.artist} - ${songInfo.title}`);

    if (fs.existsSync(downloadsPath)) {
        const found = fs.readdirSync(downloadsPath).find(f => f.startsWith(filename) && f.endsWith('.m4a'));
        return found ? path.join(downloadsPath, found) : null;
    }
    return null;
};

/** Delete a downloaded file from disk */
const deleteDownload = async (filePath) => {
    if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
    }
    return false;
};

module.exports = {
    downloadSong,
    isAlreadyDownloaded,
    deleteDownload,
};
