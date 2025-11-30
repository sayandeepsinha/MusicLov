import { FormatType, ErrorCode } from './constants.js';
import { findFirst } from './utils/helpers.js';
import { SignatureDecipher } from './SignatureDecipher.js';

/**
 * StreamExtractor - Extracts streamable URLs from player responses
 */
export class StreamExtractor {
    /**
     * Get the best audio format from player response
     * @param {Object} playerResponse - Player response from InnertubeClient
     * @returns {Promise<Object>} Best audio format with URL
     */
    static async getBestAudioFormat(playerResponse) {
        if (!playerResponse || !playerResponse.streamingData) {
            throw {
                code: ErrorCode.NO_STREAM_FOUND,
                message: 'No streaming data found in player response',
            };
        }

        const streamingData = playerResponse.streamingData;
        const formats = [
            ...(streamingData.adaptiveFormats || []),
            ...(streamingData.formats || []),
        ];

        if (formats.length === 0) {
            throw {
                code: ErrorCode.NO_STREAM_FOUND,
                message: 'No formats found in streaming data',
            };
        }

        // Filter for audio-only formats
        const audioFormats = formats.filter(format =>
            format.mimeType && format.mimeType.includes('audio')
        );

        if (audioFormats.length === 0) {
            throw {
                code: ErrorCode.NO_STREAM_FOUND,
                message: 'No audio formats found',
            };
        }

        // Sort by bitrate (highest first)
        audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        const bestFormat = audioFormats[0];

        // Extract the stream URL
        const streamUrl = await this.extractStreamUrl(bestFormat, playerResponse.videoDetails?.videoId);

        return {
            ...bestFormat,
            url: streamUrl,
        };
    }

    /**
     * Extract stream URL from format
     * Handles both direct URLs and ciphered URLs
     * @param {Object} format - Format object
     * @param {string} videoId - Video ID (needed for cipher decryption)
     * @returns {Promise<string>} Stream URL
     */
    static async extractStreamUrl(format, videoId) {
        // Direct URL (no cipher)
        if (format.url) {
            return format.url;
        }

        // Ciphered URL
        if (format.signatureCipher || format.cipher) {
            const cipherData = this.parseCipher(format.signatureCipher || format.cipher);

            if (!cipherData.url) {
                throw {
                    code: ErrorCode.CIPHER_ERROR,
                    message: 'No URL found in cipher data',
                };
            }

            // If there's a signature, we need to decipher it
            if (cipherData.s) {
                try {
                    const decipheredSignature = await SignatureDecipher.decipher(cipherData.s, videoId);
                    const signatureParam = cipherData.sp || 'signature';

                    // Append deciphered signature to URL
                    const url = new URL(cipherData.url);
                    url.searchParams.set(signatureParam, decipheredSignature);

                    return url.toString();
                } catch (error) {
                    console.error('Failed to decipher signature:', error);
                    throw {
                        code: ErrorCode.CIPHER_ERROR,
                        message: 'Failed to decipher signature',
                        originalError: error,
                    };
                }
            }

            return cipherData.url;
        }

        throw {
            code: ErrorCode.NO_STREAM_FOUND,
            message: 'No URL or cipher found in format',
        };
    }

    /**
     * Parse cipher string into components
     * @param {string} cipher - Cipher string
     * @returns {Object} Parsed cipher data
     */
    static parseCipher(cipher) {
        const params = new URLSearchParams(cipher);

        return {
            url: params.get('url'),
            s: params.get('s'),
            sp: params.get('sp'),
        };
    }

    /**
     * Get all available audio formats
     * @param {Object} playerResponse - Player response
     * @returns {Array} All audio formats
     */
    static getAllAudioFormats(playerResponse) {
        if (!playerResponse || !playerResponse.streamingData) {
            return [];
        }

        const streamingData = playerResponse.streamingData;
        const formats = [
            ...(streamingData.adaptiveFormats || []),
            ...(streamingData.formats || []),
        ];

        return formats.filter(format =>
            format.mimeType && format.mimeType.includes('audio')
        );
    }

    /**
     * Get format by itag
     * @param {Object} playerResponse - Player response
     * @param {number} itag - Format itag
     * @returns {Object|null} Format or null
     */
    static getFormatByItag(playerResponse, itag) {
        if (!playerResponse || !playerResponse.streamingData) {
            return null;
        }

        const streamingData = playerResponse.streamingData;
        const formats = [
            ...(streamingData.adaptiveFormats || []),
            ...(streamingData.formats || []),
        ];

        return findFirst(formats, format => format.itag === itag);
    }
}
