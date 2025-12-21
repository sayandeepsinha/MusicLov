const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    search: (query) => ipcRenderer.invoke('search', query),
    browse: (category) => ipcRenderer.invoke('browse', category),
    getAudioUrl: (videoId) => ipcRenderer.invoke('get-audio-url', videoId),
});
