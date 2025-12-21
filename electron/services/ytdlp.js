/**
 * yt-dlp Service
 * Extracts audio URLs from YouTube using yt-dlp binary
 */
const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');

/**
 * Get the path to the yt-dlp binary
 */
function getYtdlpPath() {
    const isDev = !app.isPackaged;
    if (isDev) {
        return path.join(__dirname, '../../binaries/yt-dlp');
    }
    return path.join(process.resourcesPath, 'binaries/yt-dlp');
}

/**
 * Get the audio URL for a YouTube video
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<string>} - Direct audio stream URL
 */
async function getAudioUrl(videoId) {
    return new Promise((resolve, reject) => {
        const ytdlpPath = getYtdlpPath();

        const ytdlp = spawn(ytdlpPath, [
            '-g',
            '-f', 'bestaudio',
            '--no-playlist',
            `https://www.youtube.com/watch?v=${videoId}`
        ]);

        let audioUrl = '';
        let errorOutput = '';

        ytdlp.stdout.on('data', (data) => {
            audioUrl += data.toString();
        });

        ytdlp.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        ytdlp.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`yt-dlp failed: ${errorOutput}`));
            } else {
                resolve(audioUrl.trim());
            }
        });

        ytdlp.on('error', reject);
    });
}

module.exports = {
    getAudioUrl,
    getYtdlpPath,
};
