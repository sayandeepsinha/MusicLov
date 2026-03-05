const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Online music APIs
    search: (query) => ipcRenderer.invoke('search', query),
    browse: (category) => ipcRenderer.invoke('browse', category),

    // Audio Engine controls (YouTube playback via hidden Chromium window)
    enginePlay: (videoId) => ipcRenderer.invoke('engine:play', videoId),
    enginePause: () => ipcRenderer.invoke('engine:pause'),
    engineResume: () => ipcRenderer.invoke('engine:resume'),
    engineSeek: (timeSeconds) => ipcRenderer.invoke('engine:seek', timeSeconds),
    engineSetVolume: (volume) => ipcRenderer.invoke('engine:set-volume', volume),
    engineSetMuted: (muted) => ipcRenderer.invoke('engine:set-muted', muted),
    engineStop: () => ipcRenderer.invoke('engine:stop'),

    // Engine event listeners (receive state from hidden window)
    onEngineEvent: (callback) => {
        const channels = ['engine:timeupdate', 'engine:ended', 'engine:ready', 'engine:loading', 'engine:error'];
        const handlers = channels.map(ch => {
            const handler = (_, data) => callback(ch, data);
            ipcRenderer.on(ch, handler);
            return { channel: ch, handler };
        });
        // Return cleanup function
        return () => {
            handlers.forEach(({ channel, handler }) => {
                ipcRenderer.removeListener(channel, handler);
            });
        };
    },

    // Local library APIs
    scanDefaultMusicFolder: () => ipcRenderer.invoke('scan-default-music-folder'),
    selectMusicFolder: () => ipcRenderer.invoke('select-music-folder'),
    importMusicFolders: (folderPaths) => ipcRenderer.invoke('import-music-folders', folderPaths),
    getLocalFileUrl: (filePath) => ipcRenderer.invoke('get-local-file-url', filePath),
    getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),

    // Download APIs
    downloadSong: (videoId, songInfo) => ipcRenderer.invoke('download-song', { videoId, songInfo }),
    isSongDownloaded: (videoId, songInfo) => ipcRenderer.invoke('is-song-downloaded', { videoId, songInfo }),
    deleteDownload: (filePath) => ipcRenderer.invoke('delete-download', filePath),
});
