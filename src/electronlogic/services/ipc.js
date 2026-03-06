/**
 * IPC Handlers - All IPC main process handlers
 */
const { ipcMain } = require('electron');

function registerHandlers({ audioEngine, youtube, innertube, localLibrary, recommender }) {
    // Search & Browse
    ipcMain.handle('search', (_, query) => innertube.search(query));
    ipcMain.handle('browse', (_, { query, limit = 30 }) => innertube.browse(query, limit));
    ipcMain.handle('get-recommendations', (_, { videoId, limit }) => recommender.getRecommendations(videoId, limit));
    ipcMain.handle('get-personalized-mix', (_, { historyIds, limit }) => recommender.getPersonalizedMix(historyIds, limit));

    // Audio Engine controls (YouTube playback)
    ipcMain.handle('engine:play', (_, videoId) => audioEngine.play(videoId));
    ipcMain.handle('engine:pause', () => audioEngine.pause());
    ipcMain.handle('engine:resume', () => audioEngine.resume());
    ipcMain.handle('engine:seek', (_, timeSeconds) => audioEngine.seek(timeSeconds));
    ipcMain.handle('engine:set-volume', (_, volume) => audioEngine.setVolume(volume));
    ipcMain.handle('engine:set-muted', (_, muted) => audioEngine.setMuted(muted));
    ipcMain.handle('engine:stop', () => audioEngine.stop());
    ipcMain.handle('engine:get-state', () => audioEngine.getState());

    // Local library
    ipcMain.handle('scan-default-music-folder', () => localLibrary.scanDefaultMusicFolder());
    ipcMain.handle('select-music-folder', () => localLibrary.selectMusicFolder());
    ipcMain.handle('import-music-folders', (_, paths) => localLibrary.importFromFolders(paths));
    ipcMain.handle('get-local-file-url', (_, path) => localLibrary.getLocalFileUrl(path));
    ipcMain.handle('get-platform-info', () => localLibrary.getPlatformInfo());

    // Downloads
    ipcMain.handle('download-song', (_, { videoId, songInfo }) => youtube.downloadSong(videoId, songInfo.title, songInfo));
    ipcMain.handle('is-song-downloaded', (_, { videoId, songInfo }) => youtube.isAlreadyDownloaded(videoId, songInfo));
    ipcMain.handle('delete-download', (_, filePath) => youtube.deleteDownload(filePath));
}

module.exports = { registerHandlers };
