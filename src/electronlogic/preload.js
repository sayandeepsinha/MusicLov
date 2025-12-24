const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Online music APIs
    search: (query) => ipcRenderer.invoke('search', query),
    browse: (category) => ipcRenderer.invoke('browse', category),
    getAudioUrl: (videoId) => ipcRenderer.invoke('get-audio-url', videoId),

    // Local library APIs
    scanDefaultMusicFolder: () => ipcRenderer.invoke('scan-default-music-folder'),
    selectMusicFolder: () => ipcRenderer.invoke('select-music-folder'),
    importMusicFolders: (folderPaths) => ipcRenderer.invoke('import-music-folders', folderPaths),
    getLocalFileUrl: (filePath) => ipcRenderer.invoke('get-local-file-url', filePath),
    getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),

    // Download APIs
    downloadSong: (videoId, songInfo) => ipcRenderer.invoke('download-song', { videoId, songInfo }),
    isSongDownloaded: (videoId, songInfo) => ipcRenderer.invoke('is-song-downloaded', { videoId, songInfo }),
    getDownloadedSongs: () => ipcRenderer.invoke('get-downloaded-songs'),
    deleteDownload: (filePath) => ipcRenderer.invoke('delete-download', filePath),
});
