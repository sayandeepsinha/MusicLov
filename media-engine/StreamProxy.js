import { StreamConfig, RetryConfig } from './config.js';
import { retryWithBackoff } from './utils/helpers.js';

/**
 * StreamProxy - Proxies and manages audio streams from YouTube
 */
export class StreamProxy {
    /**
     * Proxy a stream from YouTube
     * @param {string} url - Stream URL
     * @param {Request} request - Incoming request (for range headers)
     * @returns {Promise<Response>} Stream response
     */
    static async proxyStream(url, request) {
        try {
            // Extract range header if present
            const range = request.headers.get('range');

            if (range) {
                return await this.handleRangeRequest(url, range);
            } else {
                return await this.handleFullRequest(url);
            }
        } catch (error) {
            console.error('Stream proxy error:', error);
            throw error;
        }
    }

    /**
     * Handle full stream request (no range)
     * @param {string} url - Stream URL
     * @returns {Promise<Response>} Stream response
     */
    static async handleFullRequest(url) {
        const response = await retryWithBackoff(
            async () => {
                const res = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    },
                });

                if (!res.ok) {
                    throw new Error(`Stream fetch failed: ${res.status}`);
                }

                return res;
            },
            RetryConfig.MAX_RETRIES,
            RetryConfig.RETRY_DELAY,
            RetryConfig.BACKOFF_MULTIPLIER
        );

        // Return response with appropriate headers
        return new Response(response.body, {
            status: 200,
            headers: {
                'Content-Type': response.headers.get('content-type') || 'audio/mp4',
                'Content-Length': response.headers.get('content-length') || '',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }

    /**
     * Handle range request (for seeking)
     * @param {string} url - Stream URL
     * @param {string} range - Range header value
     * @returns {Promise<Response>} Partial content response
     */
    static async handleRangeRequest(url, range) {
        const response = await retryWithBackoff(
            async () => {
                const res = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                        'Range': range,
                    },
                });

                if (!res.ok && res.status !== 206) {
                    throw new Error(`Range request failed: ${res.status}`);
                }

                return res;
            },
            RetryConfig.MAX_RETRIES,
            RetryConfig.RETRY_DELAY,
            RetryConfig.BACKOFF_MULTIPLIER
        );

        // Return partial content response
        return new Response(response.body, {
            status: 206,
            headers: {
                'Content-Type': response.headers.get('content-type') || 'audio/mp4',
                'Content-Range': response.headers.get('content-range') || '',
                'Content-Length': response.headers.get('content-length') || '',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }

    /**
     * Get stream metadata without downloading
     * @param {string} url - Stream URL
     * @returns {Promise<Object>} Stream metadata
     */
    static async getStreamMetadata(url) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                },
            });

            return {
                contentType: response.headers.get('content-type'),
                contentLength: parseInt(response.headers.get('content-length') || '0'),
                acceptsRanges: response.headers.get('accept-ranges') === 'bytes',
            };
        } catch (error) {
            console.error('Failed to get stream metadata:', error);
            return null;
        }
    }
}
