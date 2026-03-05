/**
 * YouTube Service - Downloads using the engine's authenticated session
 */
const path = require('path');
const fs = require('fs');
const { net } = require('electron');
const { app } = require('electron');
const audioEngine = require('./audioEngine');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Downloads a song by extracting the audio stream URL from the engine's
 * authenticated session and streaming it via Electron's net module.
 */
const downloadSong = async (videoId, title, metadata = {}) => {
    // Feature disabled for now
    console.log(`[YouTube] Download requested for ${videoId} but feature is disabled.`);
    return null;
};

/**
 * Use InnerTube player API to get an audio stream URL for downloading.
 * This uses the engine's authenticated session cookies.
 */
async function getStreamUrlForDownload(videoId) {
    try {
        const ses = audioEngine.getSession();
        const cookies = await ses.cookies.get({ url: 'https://www.youtube.com' });
        const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        const response = await net.fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)',
                'Cookie': cookieStr,
                'X-YouTube-Client-Name': '5',
                'X-YouTube-Client-Version': '19.29.1',
                'Referer': 'https://www.youtube.com/',
                'Origin': 'https://www.youtube.com',
            },
            body: JSON.stringify({
                context: {
                    client: {
                        clientName: 'IOS',
                        clientVersion: '19.29.1',
                        deviceModel: 'iPhone16,2',
                        osName: 'iOS',
                        osVersion: '17.5.1.21F90',
                        hl: 'en',
                        gl: 'US',
                        utcOffsetMinutes: 0,
                    },
                },
                videoId: videoId,
                playbackContext: { contentPlaybackContext: { signatureTimestamp: Math.floor(Date.now() / 1000) - 86400 } }
            }),
            session: ses,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[YouTube] Player API returned ${response.status}: ${errorText}`);
            return null;
        }

        const data = await response.json();
        const streamingData = data?.streamingData || {};
        const formats = [
            ...(streamingData.adaptiveFormats || []),
            ...(streamingData.formats || [])
        ];

        // Filter for audio formats that have a direct URL (not a cipher)
        const audioFormats = formats
            .filter(f => f.mimeType?.startsWith('audio/') && f.url)
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        if (audioFormats.length > 0) {
            return audioFormats[0].url;
        }

        // Final fallback: any format with a direct URL
        const fallbackFormat = formats.find(f => f.url);
        return fallbackFormat ? fallbackFormat.url : null;
    } catch (e) {
        console.error('[YouTube] Stream URL extraction error:', e.message);
        return null;
    }
}

// Check if song already downloaded
const isAlreadyDownloaded = (videoId, songInfo) => {
    const sanitize = (name) => name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
    const downloadsPath = path.join(app.getPath('music'), 'MusicLov');
    const filename = sanitize(`${songInfo.artist} - ${songInfo.title}`);

    if (fs.existsSync(downloadsPath)) {
        const found = fs.readdirSync(downloadsPath).find(f => f.startsWith(filename) && f.endsWith('.m4a'));
        return found ? path.join(downloadsPath, found) : null;
    }
    return null;
};

// Delete downloaded file
const deleteDownload = async (filePath) => {
    if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
    }
    return false;
};

module.exports = {
    downloadSong,
    isAlreadyDownloaded,
    deleteDownload,
};
