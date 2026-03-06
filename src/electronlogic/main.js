/**
 * MusicLov - Electron Main Process
 */
const { app, BrowserWindow, protocol, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

// Register protocol schemes before app ready
if (protocol) {
    try {
        protocol.registerSchemesAsPrivileged([
            { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
        ]);
    } catch (e) { /* logger not yet available at this point — use console as fallback */
        console.error('[MusicLov] Protocol registration failed:', e);
    }
}

// Services
const logger = require('./services/logger');
const audioEngine = require('./services/audioEngine');
const youtube = require('./services/youtube');
const innertube = require('./services/innertube');
const localLibrary = require('./services/localLibrary');
const recommender = require('./recommender');
const { registerHandlers } = require('./services/ipc');
const { MIME_TYPES } = require('./config');

// Suppress noisy Chromium internal warnings
app.commandLine.appendSwitch('disable-logging');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, height: 800, minWidth: 800, minHeight: 600,
        titleBarStyle: 'hiddenInset', backgroundColor: '#0a0a0a',
        webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js'), webSecurity: true },
    });

    // Initialize the audio engine with a reference to the main window
    audioEngine.init(mainWindow);

    const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
    isDev ? mainWindow.loadURL('http://localhost:5050') : mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    mainWindow.on('closed', () => {
        audioEngine.destroy();
        mainWindow = null;
    });
}

// Media protocol handler for local file streaming with seek support
function handleMediaRequest(request) {
    const filePath = decodeURIComponent(request.url.substring(8));
    try {
        const { size } = fs.statSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'audio/mpeg';
        const range = request.headers.get('Range');

        if (range) {
            const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
            const start = parseInt(startStr, 10);
            const end = endStr ? parseInt(endStr, 10) : size - 1;
            return new Response(Readable.toWeb(fs.createReadStream(filePath, { start, end })), {
                status: 206,
                headers: { 'Content-Type': contentType, 'Content-Length': (end - start + 1).toString(), 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' }
            });
        }
        return new Response(Readable.toWeb(fs.createReadStream(filePath)), {
            status: 200, headers: { 'Content-Type': contentType, 'Content-Length': size.toString(), 'Accept-Ranges': 'bytes' }
        });
    } catch (e) {
        return new Response('File not found', { status: 404 });
    }
}

app.whenReady().then(() => {
    protocol.handle('media', handleMediaRequest);
    registerHandlers({ audioEngine, youtube, innertube, localLibrary, recommender });
    createWindow();

    // Register media keys to forward to UI
    globalShortcut.register('MediaPlayPause', () => { if (mainWindow) mainWindow.webContents.send('media:play-pause'); });
    globalShortcut.register('MediaNextTrack', () => { if (mainWindow) mainWindow.webContents.send('media:next-track'); });
    globalShortcut.register('MediaPreviousTrack', () => { if (mainWindow) mainWindow.webContents.send('media:previous-track'); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!mainWindow) createWindow(); });
app.on('before-quit', () => { audioEngine.destroy(); });
