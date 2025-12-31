/**
 * YouTube Service - Audio extraction and downloads via yt-dlp
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { existsSync, mkdirSync, readdirSync } = require('fs');
const { AUDIO_EXTENSIONS, getDefaultMusicPath, getYtdlpPath } = require('../config');

const DOWNLOADS_FOLDER = 'MusicLov Downloads';

const getDownloadsPath = () => {
    const p = path.join(getDefaultMusicPath(), DOWNLOADS_FOLDER);
    if (!existsSync(p)) mkdirSync(p, { recursive: true });
    return p;
};

const sanitize = (name) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);

// Get audio stream URL for a YouTube video
const getAudioUrl = (videoId) => new Promise((resolve, reject) => {
    const ytdlp = spawn(getYtdlpPath(), ['-g', '-f', 'bestaudio', '--no-playlist', `https://www.youtube.com/watch?v=${videoId}`]);
    let audioUrl = '', error = '';

    ytdlp.stdout.on('data', d => audioUrl += d.toString());
    ytdlp.stderr.on('data', d => error += d.toString());
    ytdlp.on('close', code => code !== 0 ? reject(new Error(error || 'yt-dlp failed')) : resolve(audioUrl.trim()));
    ytdlp.on('error', reject);
});

// Download a song as audio file
const downloadSong = (videoId, songInfo) => new Promise((resolve, reject) => {
    const filename = sanitize(`${songInfo.artist} - ${songInfo.title}`);
    const outputFile = path.join(getDownloadsPath(), `${filename}.%(ext)s`);

    const ytdlp = spawn(getYtdlpPath(), ['-f', 'bestaudio', '-o', outputFile, '--no-playlist', `https://www.youtube.com/watch?v=${videoId}`]);
    let error = '';

    ytdlp.stdout.on('data', d => console.log('[Download]', d.toString().trim()));
    ytdlp.stderr.on('data', d => error += d.toString());
    ytdlp.on('close', code => {
        if (code !== 0) return reject(new Error(error || 'Download failed'));
        const file = readdirSync(getDownloadsPath()).find(f => f.startsWith(filename) && AUDIO_EXTENSIONS.some(ext => f.endsWith(ext)));
        if (!file) return reject(new Error('File not found'));
        resolve({ filePath: path.join(getDownloadsPath(), file), fileName: file });
    });
    ytdlp.on('error', reject);
});

// Check if song already downloaded
const isAlreadyDownloaded = (videoId, songInfo) => {
    const filename = sanitize(`${songInfo.artist} - ${songInfo.title}`);
    const found = existsSync(getDownloadsPath()) && readdirSync(getDownloadsPath()).find(f => f.startsWith(filename) && AUDIO_EXTENSIONS.some(ext => f.endsWith(ext)));
    return found ? path.join(getDownloadsPath(), found) : null;
};

// Delete downloaded file
const deleteDownload = async (filePath) => {
    if (existsSync(filePath)) { await fs.unlink(filePath); return true; }
    return false;
};

module.exports = { getAudioUrl, downloadSong, isAlreadyDownloaded, deleteDownload };
