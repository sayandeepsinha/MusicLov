import { Config, ClientContexts, ClientPriority, RetryConfig } from './config.js';
import { Endpoint, ErrorCode, PlayabilityStatus } from './constants.js';
import { ResponseParser } from './ResponseParser.js';
import { retryWithBackoff, isValidVideoId } from './utils/helpers.js';
import { cache } from './utils/cache.js';

/**
 * InnertubeClient - Main client for YouTube's Innertube API
 */
export class InnertubeClient {
    constructor() {
        this.baseUrl = Config.BASE_URL;
        this.apiKey = Config.API_KEY;
    }

    /**
     * Make a request to YouTube's Innertube API
     * @param {string} endpoint - API endpoint
     * @param {Object} body - Request body
     * @param {string} clientType - Client type to use
     * @returns {Promise<Object>} API response
     */
    async request(endpoint, body = {}, clientType = 'WEB_REMIX') {
        const url = new URL(endpoint, this.baseUrl);
        url.searchParams.append('key', this.apiKey);
        url.searchParams.append('prettyPrint', 'false');

        const clientContext = ClientContexts[clientType];
        if (!clientContext) {
            throw new Error(`Invalid client type: ${clientType}`);
        }

        // Build request body with context
        const requestBody = {
            context: {
                client: clientContext,
            },
            ...body,
        };

        const headers = {
            'User-Agent': clientContext.userAgent || Config.USER_AGENT,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': this.baseUrl,
            'Referer': this.baseUrl + '/',
        };

        try {
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Innertube Request Failed:', error);
            throw {
                code: ErrorCode.API_ERROR,
                message: error.message,
                originalError: error,
            };
        }
    }

    /**
     * Search for content on YouTube Music
     * @param {string} query - Search query
     * @param {string} filter - Search filter (from SearchFilter constants)
     * @returns {Promise<Array>} Search results
     */
    async search(query, filter = null) {
        if (!query || typeof query !== 'string') {
            throw new Error('Invalid search query');
        }

        const body = {
            query: query,
        };

        if (filter) {
            body.params = filter;
        }

        try {
            const response = await this.request(Endpoint.SEARCH, body, 'WEB_REMIX');
            return ResponseParser.parseSearchResults(response);
        } catch (error) {
            console.error('Search failed:', error);
            throw error;
        }
    }

    /**
     * Get player response for a video
     * Uses multiple client fallbacks for best compatibility
     * @param {string} videoId - YouTube video ID
     * @returns {Promise<Object>} Player response
     */
    async player(videoId) {
        if (!isValidVideoId(videoId)) {
            throw {
                code: ErrorCode.INVALID_VIDEO_ID,
                message: `Invalid video ID: ${videoId}`,
            };
        }

        // Check cache first
        const cacheKey = `player_${videoId}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            console.log(`Using cached player response for ${videoId}`);
            return cached;
        }

        let lastError = null;

        // Try clients in priority order
        for (const clientType of ClientPriority) {
            try {
                console.log(`Trying ${clientType} client for video ${videoId}`);

                const body = {
                    videoId: videoId,
                };

                // Add special parameters for TV_EMBEDDED client
                if (clientType === 'TV_EMBEDDED') {
                    body.context = {
                        client: ClientContexts[clientType],
                        thirdParty: {
                            embedUrl: `https://www.youtube.com/watch?v=${videoId}`,
                        },
                    };
                }

                const response = await this.request(
                    Endpoint.PLAYER,
                    body,
                    clientType
                );

                // Check playability
                const status = response.playabilityStatus?.status;

                if (status === PlayabilityStatus.OK) {
                    console.log(`✓ ${clientType} client succeeded for ${videoId}`);

                    // Cache successful response
                    cache.set(cacheKey, response);

                    return response;
                }

                console.warn(`${clientType} client returned status: ${status}`, response.playabilityStatus?.reason);
                lastError = {
                    code: ErrorCode.PLAYABILITY_ERROR,
                    message: response.playabilityStatus?.reason || 'Playability error',
                    status: status,
                };

            } catch (error) {
                console.warn(`${clientType} client failed:`, error.message);
                lastError = error;
            }
        }

        // All clients failed
        throw lastError || {
            code: ErrorCode.PLAYABILITY_ERROR,
            message: 'All clients failed to get player response',
        };
    }

    /**
     * Browse YouTube Music pages
     * @param {string} browseId - Browse ID (e.g., "FEmusic_home")
     * @returns {Promise<Object>} Browse response
     */
    async browse(browseId = 'FEmusic_home') {
        try {
            const response = await this.request(
                Endpoint.BROWSE,
                { browseId },
                'WEB_REMIX'
            );

            return ResponseParser.parseBrowseResponse(response);
        } catch (error) {
            console.error('Browse failed:', error);
            throw error;
        }
    }

    /**
     * Get next/related content for a video
     * @param {string} videoId - Video ID
     * @param {string} playlistId - Optional playlist ID
     * @param {string} params - Optional params
     * @returns {Promise<Object>} Next response
     */
    async next(videoId, playlistId = null, params = null) {
        if (!isValidVideoId(videoId)) {
            throw {
                code: ErrorCode.INVALID_VIDEO_ID,
                message: `Invalid video ID: ${videoId}`,
            };
        }

        const body = {
            videoId: videoId,
        };

        if (playlistId) {
            body.playlistId = playlistId;
        }

        if (params) {
            body.params = params;
        }

        try {
            const response = await this.request(Endpoint.NEXT, body, 'WEB_REMIX');
            return response;
        } catch (error) {
            console.error('Next request failed:', error);
            throw error;
        }
    }
}
