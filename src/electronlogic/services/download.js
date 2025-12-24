/**
 * Download Service - Downloads songs from YouTube using yt-dlp
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { existsSync, mkdirSync, readdirSync } = require('fs');
const platform = require('../platform');

const DOWNLOADS_FOLDER = 'MusicLov Downloads';
const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.opus', '.webm', '.ogg'];

// Get downloads path, create if needed
function getDownloadsPath() {
    const downloadsPath = path.join(platform.getDefaultMusicPath(), DOWNLOADS_FOLDER);
    if (!existsSync(downloadsPath)) mkdirSync(downloadsPath, { recursive: true });
    return downloadsPath;
}

// Sanitize filename
function sanitize(name) {
    return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
}

// Download a song from YouTube (native format, no ffmpeg needed)
async function downloadSong(videoId, songInfo) {
    return new Promise((resolve, reject) => {
        const ytdlpPath = platform.getYtdlpPath();
        const filename = sanitize(`${songInfo.artist} - ${songInfo.title}`);
        const outputPath = path.join(getDownloadsPath(), `${filename}.%(ext)s`);

        console.log('[Download] Starting:', songInfo.title);

        const ytdlp = spawn(ytdlpPath, [
            '-f', 'bestaudio',
            '-o', outputPath,
            '--no-playlist',
            `https://www.youtube.com/watch?v=${videoId}`
        ]);

        let error = '';
        ytdlp.stdout.on('data', d => console.log('[Download]', d.toString().trim()));
        ytdlp.stderr.on('data', d => error += d.toString());

        ytdlp.on('close', (code) => {
            if (code !== 0) return reject(new Error(error || 'Download failed'));

            const files = readdirSync(getDownloadsPath());
            const downloadedFile = files.find(f =>
                f.startsWith(filename) && AUDIO_EXTENSIONS.some(ext => f.endsWith(ext))
            );

            if (!downloadedFile) return reject(new Error('File not found'));

            const filePath = path.join(getDownloadsPath(), downloadedFile);
            console.log('[Download] Complete:', filePath);
            resolve({ filePath, fileName: downloadedFile });
        });

        ytdlp.on('error', reject);
    });
}

// Check if song file exists on disk
function isAlreadyDownloaded(videoId, songInfo) {
    const filename = sanitize(`${songInfo.artist} - ${songInfo.title}`);
    const files = existsSync(getDownloadsPath()) ? readdirSync(getDownloadsPath()) : [];
    const found = files.find(f =>
        f.startsWith(filename) && AUDIO_EXTENSIONS.some(ext => f.endsWith(ext))
    );
    return found ? path.join(getDownloadsPath(), found) : null;
}

// Get all downloaded files from disk
async function getDownloadedSongs() {
    try {
        const files = await fs.readdir(getDownloadsPath());
        return files
            .filter(f => AUDIO_EXTENSIONS.some(ext => f.endsWith(ext)))
            .map(f => path.join(getDownloadsPath(), f));
    } catch { return []; }
}

// Delete a file from disk
async function deleteDownload(filePath) {
    if (existsSync(filePath)) {
        await fs.unlink(filePath);
        return true;
    }
    return false;
}

module.exports = {
    downloadSong,
    isAlreadyDownloaded,
    getDownloadedSongs,
    deleteDownload,
};
