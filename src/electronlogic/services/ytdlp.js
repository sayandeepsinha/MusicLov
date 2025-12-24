/**
 * yt-dlp Service - Extracts audio URLs from YouTube
 */
const { spawn } = require('child_process');
const platform = require('../platform');

// Get the audio URL for a YouTube video
async function getAudioUrl(videoId) {
    return new Promise((resolve, reject) => {
        const ytdlp = spawn(platform.getYtdlpPath(), [
            '-g', '-f', 'bestaudio', '--no-playlist',
            `https://www.youtube.com/watch?v=${videoId}`
        ]);

        let audioUrl = '';
        let error = '';

        ytdlp.stdout.on('data', (data) => audioUrl += data.toString());
        ytdlp.stderr.on('data', (data) => error += data.toString());

        ytdlp.on('close', (code) => {
            if (code !== 0) reject(new Error(error || 'yt-dlp failed'));
            else resolve(audioUrl.trim());
        });

        ytdlp.on('error', reject);
    });
}

module.exports = { getAudioUrl };
