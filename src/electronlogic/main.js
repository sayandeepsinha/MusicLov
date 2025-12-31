/**
 * MusicLov - Electron Main Process
 */
const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

// Register protocol schemes before app ready
if (protocol) {
    try {
        protocol.registerSchemesAsPrivileged([
            { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
        ]);
    } catch (e) { console.error('Protocol registration failed:', e); }
}

// Services
const proxy = require('./services/proxy');
const youtube = require('./services/youtube');
const innertube = require('./services/innertube');
const localLibrary = require('./services/localLibrary');
const { registerHandlers } = require('./services/ipc');
const { MIME_TYPES } = require('./config');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, height: 800, minWidth: 800, minHeight: 600,
        titleBarStyle: 'hiddenInset', backgroundColor: '#0a0a0a',
        webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js'), webSecurity: true },
    });

    const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
    isDev ? mainWindow.loadURL('http://localhost:5050') : mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    mainWindow.on('closed', () => { mainWindow = null; });
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
    proxy.startProxyServer();
    registerHandlers({ proxy, youtube, innertube, localLibrary });
    createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!mainWindow) createWindow(); });
