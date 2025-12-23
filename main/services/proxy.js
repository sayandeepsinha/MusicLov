/**
 * Audio Proxy Server
 * Streams audio from YouTube with proper headers to bypass CORS
 */
const http = require('http');

const PROXY_PORT = 45678;

let proxyServer = null;
let audioUrlCache = new Map();

/**
 * Get the audio URL cache (for adding new URLs)
 */
function getCache() {
    return audioUrlCache;
}

/**
 * Cache an audio URL for a video ID
 */
function cacheAudioUrl(videoId, audioUrl) {
    audioUrlCache.set(videoId, audioUrl);
}

/**
 * Get the proxy URL for a video ID
 */
function getProxyUrl(videoId) {
    return `http://127.0.0.1:${PROXY_PORT}/${videoId}`;
}

/**
 * Start the local proxy server
 */
function startProxyServer() {
    if (proxyServer) return;

    proxyServer = http.createServer(async (req, res) => {
        const videoId = req.url.slice(1); // Remove leading /
        const audioUrl = audioUrlCache.get(videoId);
        let abortController = new AbortController();

        // Handle client disconnect
        req.on('close', () => {
            abortController.abort();
        });

        if (!audioUrl) {
            res.writeHead(404);
            res.end('Audio URL not found');
            return;
        }

        try {
            // Parse range header for seeking support
            const range = req.headers.range;

            // Fetch the audio with proper headers
            const fetchHeaders = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.youtube.com',
                'Referer': 'https://www.youtube.com/',
            };

            if (range) {
                fetchHeaders['Range'] = range;
            }

            const response = await fetch(audioUrl, {
                headers: fetchHeaders,
                signal: abortController.signal
            });

            // Forward response headers
            const headers = {
                'Content-Type': response.headers.get('Content-Type') || 'audio/webm',
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
            };

            if (response.headers.get('Content-Length')) {
                headers['Content-Length'] = response.headers.get('Content-Length');
            }
            if (response.headers.get('Content-Range')) {
                headers['Content-Range'] = response.headers.get('Content-Range');
            }

            res.writeHead(response.status, headers);

            // Stream the audio data
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done || res.destroyed) break;
                res.write(Buffer.from(value));
            }
            if (!res.destroyed) res.end();

        } catch (error) {
            // Ignore abort errors (client disconnected)
            if (error.name === 'AbortError') return;

            console.error('[Proxy] Error:', error.message);
            if (!res.headersSent) {
                res.writeHead(500);
                res.end('Error streaming audio');
            }
        }
    });

    proxyServer.listen(PROXY_PORT, '127.0.0.1', () => {
        console.log(`[Proxy] Audio proxy server running on http://127.0.0.1:${PROXY_PORT}`);
    });

    proxyServer.on('error', (err) => {
        console.error('[Proxy] Server error:', err);
    });
}

/**
 * Stop the proxy server
 */
function stopProxyServer() {
    if (proxyServer) {
        proxyServer.close();
        proxyServer = null;
    }
}

module.exports = {
    startProxyServer,
    stopProxyServer,
    cacheAudioUrl,
    getProxyUrl,
    getCache,
    PROXY_PORT,
};
