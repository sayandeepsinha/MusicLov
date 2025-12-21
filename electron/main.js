/**
 * MusicLov - Electron Main Process
 * Entry point that orchestrates all services
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import services
const { proxy, ytdlp, innertube } = require('./services');

let mainWindow;

// ========== WINDOW MANAGEMENT ==========
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0a0a0a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ========== APP LIFECYCLE ==========
app.whenReady().then(() => {
    proxy.startProxyServer();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// ========== IPC HANDLERS ==========

// Search for songs
ipcMain.handle('search', async (event, query) => {
    return innertube.search(query);
});

// Browse/fetch songs for a category
ipcMain.handle('browse', async (event, { query, limit = 30 }) => {
    return innertube.browse(query, limit);
});

// Get audio URL for a song
ipcMain.handle('get-audio-url', async (event, videoId) => {
    console.log('[Main] Getting audio URL for:', videoId);

    try {
        const audioUrl = await ytdlp.getAudioUrl(videoId);

        // Cache and return proxy URL (for CORS)
        proxy.cacheAudioUrl(videoId, audioUrl);
        return proxy.getProxyUrl(videoId);

    } catch (error) {
        console.error('[Main] Failed:', error.message);
        throw error;
    }
});
