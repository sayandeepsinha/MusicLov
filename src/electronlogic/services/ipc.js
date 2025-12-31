/**
 * IPC Handlers - All IPC main process handlers
 */
const { ipcMain } = require('electron');

function registerHandlers({ proxy, youtube, innertube, localLibrary }) {
    // Search & Browse
    ipcMain.handle('search', (_, query) => innertube.search(query));
    ipcMain.handle('browse', (_, { query, limit = 30 }) => innertube.browse(query, limit));

    // Audio streaming
    ipcMain.handle('get-audio-url', async (_, videoId) => {
        const audioUrl = await youtube.getAudioUrl(videoId);
        proxy.cacheAudioUrl(videoId, audioUrl);
        return proxy.getProxyUrl(videoId);
    });

    // Local library
    ipcMain.handle('scan-default-music-folder', () => localLibrary.scanDefaultMusicFolder());
    ipcMain.handle('select-music-folder', () => localLibrary.selectMusicFolder());
    ipcMain.handle('import-music-folders', (_, paths) => localLibrary.importFromFolders(paths));
    ipcMain.handle('get-local-file-url', (_, path) => localLibrary.getLocalFileUrl(path));
    ipcMain.handle('get-platform-info', () => localLibrary.getPlatformInfo());

    // Downloads
    ipcMain.handle('download-song', (_, { videoId, songInfo }) => youtube.downloadSong(videoId, songInfo));
    ipcMain.handle('is-song-downloaded', (_, { videoId, songInfo }) => youtube.isAlreadyDownloaded(videoId, songInfo));
    ipcMain.handle('delete-download', (_, filePath) => youtube.deleteDownload(filePath));
}

module.exports = { registerHandlers };
