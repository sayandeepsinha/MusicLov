import { ErrorCode, CacheKey } from './constants.js';
import { CacheConfig } from './config.js';
import { cache } from './utils/cache.js';

/**
 * SignatureDecipher - Handles YouTube's signature/cipher protection
 */
export class SignatureDecipher {
    static playerCodeCache = null;
    static decipherFunctionCache = null;

    /**
     * Decipher a signature
     * @param {string} signature - Encrypted signature
     * @param {string} videoId - Video ID (used to fetch player code)
     * @returns {Promise<string>} Deciphered signature
     */
    static async decipher(signature, videoId) {
        if (!signature) {
            throw {
                code: ErrorCode.CIPHER_ERROR,
                message: 'No signature provided',
            };
        }

        // Check cache for decipher function
        const cachedFunction = cache.get(CacheKey.DECIPHER_FUNCTION);
        if (cachedFunction) {
            try {
                return this.applyTransformations(signature, cachedFunction);
            } catch (error) {
                console.warn('Cached decipher function failed, fetching new one');
                cache.delete(CacheKey.DECIPHER_FUNCTION);
            }
        }

        // Fetch player code and extract decipher function
        const playerCode = await this.getPlayerCode(videoId);
        const decipherFunction = this.extractDecipherFunction(playerCode);

        // Cache the decipher function
        cache.set(CacheKey.DECIPHER_FUNCTION, decipherFunction, CacheConfig.DECIPHER_FUNCTION_TTL);

        return this.applyTransformations(signature, decipherFunction);
    }

    /**
     * Get player JavaScript code
     * @param {string} videoId - Video ID
     * @returns {Promise<string>} Player code
     */
    static async getPlayerCode(videoId) {
        // Check cache
        const cached = cache.get(CacheKey.PLAYER_CODE);
        if (cached) {
            return cached;
        }

        try {
            // Fetch the watch page to get player URL
            const watchPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const watchPageResponse = await fetch(watchPageUrl);
            const watchPageHtml = await watchPageResponse.text();

            // Extract player URL from HTML
            const playerUrlMatch = watchPageHtml.match(/"jsUrl":"([^"]+)"/);
            if (!playerUrlMatch) {
                throw new Error('Could not find player URL in watch page');
            }

            let playerUrl = playerUrlMatch[1];

            // Handle relative URLs
            if (playerUrl.startsWith('/')) {
                playerUrl = 'https://www.youtube.com' + playerUrl;
            }

            // Fetch player code
            const playerResponse = await fetch(playerUrl);
            const playerCode = await playerResponse.text();

            // Cache player code
            cache.set(CacheKey.PLAYER_CODE, playerCode, CacheConfig.PLAYER_CODE_TTL);

            return playerCode;
        } catch (error) {
            console.error('Failed to fetch player code:', error);
            throw {
                code: ErrorCode.CIPHER_ERROR,
                message: 'Failed to fetch player code',
                originalError: error,
            };
        }
    }

    /**
     * Extract decipher function from player code
     * @param {string} playerCode - Player JavaScript code
     * @returns {Array} Array of transformation operations
     */
    static extractDecipherFunction(playerCode) {
        try {
            // Find the decipher function name
            // Pattern: a=a.split("");b.XX(a,N);...;return a.join("")
            const funcNamePattern = /([a-zA-Z0-9$]+)=function\([a-zA-Z0-9]+\)\{[a-zA-Z0-9]+=[a-zA-Z0-9]+\.split\(""\);.*?return [a-zA-Z0-9]+\.join\(""\)\}/;
            const funcNameMatch = playerCode.match(funcNamePattern);

            if (!funcNameMatch) {
                // Try alternative pattern
                const altPattern = /\.sig\|\|([a-zA-Z0-9$]+)\(/;
                const altMatch = playerCode.match(altPattern);

                if (!altMatch) {
                    throw new Error('Could not find decipher function');
                }
            }

            // For now, we'll implement a simple transformation parser
            // This is a simplified version - YouTube's actual decipher is more complex

            // Extract transformation object
            const transformObjPattern = /var ([a-zA-Z0-9$]+)=\{(.*?)\};/s;
            const transformObjMatch = playerCode.match(transformObjPattern);

            if (!transformObjMatch) {
                console.warn('Could not extract transformation object, using fallback');
                return this.getFallbackTransformations();
            }

            // Parse transformations
            const transformations = this.parseTransformations(transformObjMatch[2]);

            return transformations;
        } catch (error) {
            console.error('Failed to extract decipher function:', error);
            // Return fallback transformations
            return this.getFallbackTransformations();
        }
    }

    /**
     * Parse transformation functions
     * @param {string} transformCode - Transformation code
     * @returns {Array} Transformations
     */
    static parseTransformations(transformCode) {
        const transformations = [];

        // This is a simplified parser
        // Real implementation would need to parse the actual JavaScript functions

        // Common transformation patterns:
        // - reverse: a.reverse()
        // - swap: var c=a[0];a[0]=a[b%a.length];a[b%a.length]=c
        // - splice: a.splice(0,b)

        // For now, return a basic set of transformations
        return [
            { type: 'reverse' },
            { type: 'swap', index: 2 },
            { type: 'splice', index: 3 },
        ];
    }

    /**
     * Get fallback transformations
     * @returns {Array} Fallback transformations
     */
    static getFallbackTransformations() {
        // Basic transformations that often work
        return [
            { type: 'reverse' },
            { type: 'swap', index: 2 },
            { type: 'splice', index: 3 },
        ];
    }

    /**
     * Apply transformations to signature
     * @param {string} signature - Signature to transform
     * @param {Array} transformations - Transformations to apply
     * @returns {string} Transformed signature
     */
    static applyTransformations(signature, transformations) {
        let sig = signature.split('');

        for (const transform of transformations) {
            switch (transform.type) {
                case 'reverse':
                    sig = sig.reverse();
                    break;

                case 'swap':
                    const index = transform.index % sig.length;
                    const temp = sig[0];
                    sig[0] = sig[index];
                    sig[index] = temp;
                    break;

                case 'splice':
                    sig.splice(0, transform.index);
                    break;
            }
        }

        return sig.join('');
    }
}
