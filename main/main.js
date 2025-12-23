/**
 * MusicLov - Electron Main Process
 * Entry point that orchestrates all services
 */
const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

// Register custom protocol privileges MUST be done before app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);

// Import services
const { proxy, ytdlp, innertube, localLibrary } = require('./services');

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
            // Allow media protocol
            webSecurity: true
        },
    });

    const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:5050');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ========== APP LIFECYCLE ==========
app.whenReady().then(() => {
    // Register custom protocol for local media - supports seeking via range requests
    protocol.handle('media', async (request) => {
        const filePath = decodeURIComponent(request.url.substring(8)); // Remove 'media://'
        console.log('[MediaProtocol] Serving:', filePath);

        try {
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const rangeHeader = request.headers.get('Range');

            // Determine MIME type based on extension
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                '.mp3': 'audio/mpeg',
                '.m4a': 'audio/mp4',
                '.wav': 'audio/wav',
                '.flac': 'audio/flac',
                '.ogg': 'audio/ogg',
                '.aac': 'audio/aac',
                '.wma': 'audio/x-ms-wma',
                '.opus': 'audio/opus',
            };
            const contentType = mimeTypes[ext] || 'audio/mpeg';

            if (rangeHeader) {
                // Parse range header: "bytes=start-end"
                const parts = rangeHeader.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunkSize = end - start + 1;

                console.log('[MediaProtocol] Range request:', start, '-', end, '/', fileSize);

                // Create a readable stream for the specific byte range
                const stream = fs.createReadStream(filePath, { start, end });

                // Convert Node stream to Web ReadableStream
                const webStream = Readable.toWeb(stream);

                return new Response(webStream, {
                    status: 206,
                    headers: {
                        'Content-Type': contentType,
                        'Content-Length': chunkSize.toString(),
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                    },
                });
            } else {
                // No range request - serve entire file
                console.log('[MediaProtocol] Full file request, size:', fileSize);

                const stream = fs.createReadStream(filePath);
                const webStream = Readable.toWeb(stream);

                return new Response(webStream, {
                    status: 200,
                    headers: {
                        'Content-Type': contentType,
                        'Content-Length': fileSize.toString(),
                        'Accept-Ranges': 'bytes',
                    },
                });
            }
        } catch (error) {
            console.error('[MediaProtocol] Error:', error.message);
            return new Response('File not found', { status: 404 });
        }
    });

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

// ========== LOCAL LIBRARY IPC HANDLERS ==========

// Scan the default music folder
ipcMain.handle('scan-default-music-folder', async () => {
    console.log('[Main] Scanning default music folder');
    try {
        return await localLibrary.scanDefaultMusicFolder();
    } catch (error) {
        console.error('[Main] Failed to scan default folder:', error.message);
        throw error;
    }
});

// Open folder picker dialog
ipcMain.handle('select-music-folder', async () => {
    console.log('[Main] Opening folder picker');
    try {
        return await localLibrary.selectMusicFolder();
    } catch (error) {
        console.error('[Main] Failed to open folder picker:', error.message);
        throw error;
    }
});

// Import from selected folders
ipcMain.handle('import-music-folders', async (event, folderPaths) => {
    console.log('[Main] Importing from folders:', folderPaths);
    try {
        return await localLibrary.importFromFolders(folderPaths);
    } catch (error) {
        console.error('[Main] Failed to import folders:', error.message);
        throw error;
    }
});

// Get local file URL
ipcMain.handle('get-local-file-url', async (event, filePath) => {
    return localLibrary.getLocalFileUrl(filePath);
});

// Get platform info
ipcMain.handle('get-platform-info', async () => {
    return localLibrary.getPlatformInfo();
});

