/**
 * yt-dlp Service
 * Extracts audio URLs from YouTube using yt-dlp binary
 * Uses platform-specific binary path from the platforms module
 */
const { spawn } = require('child_process');

// Import platform-specific path resolver
const platform = require('../platforms');

/**
 * Get the audio URL for a YouTube video
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<string>} - Direct audio stream URL
 */
async function getAudioUrl(videoId) {
    return new Promise((resolve, reject) => {
        const ytdlpPath = platform.getYtdlpPath();

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

/**
 * Get the path to the yt-dlp binary (delegates to platform module)
 */
function getYtdlpPath() {
    return platform.getYtdlpPath();
}

module.exports = {
    getAudioUrl,
    getYtdlpPath,
};
