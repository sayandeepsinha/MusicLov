/**
 * Navigate nested object safely
 * @param {Object} obj - Object to navigate
 * @param {string} path - Dot-separated path (e.g., "a.b.c")
 * @param {any} defaultValue - Default value if path not found
 * @returns {any}
 */
export function getNestedValue(obj, path, defaultValue = null) {
    if (!obj || !path) return defaultValue;

    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = result[key];
    }

    return result !== undefined ? result : defaultValue;
}

/**
 * Parse query parameters from URL
 * @param {string} url - URL string
 * @returns {Object} Query parameters as object
 */
export function parseQueryParams(url) {
    try {
        const urlObj = new URL(url);
        const params = {};
        for (const [key, value] of urlObj.searchParams.entries()) {
            params[key] = value;
        }
        return params;
    } catch (error) {
        return {};
    }
}

/**
 * Extract video ID from various YouTube URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null
 */
export function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

/**
 * Validate video ID format
 * @param {string} videoId - Video ID to validate
 * @returns {boolean}
 */
export function isValidVideoId(videoId) {
    if (!videoId || typeof videoId !== 'string') {
        return false;
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @param {number} backoffMultiplier - Backoff multiplier
 * @returns {Promise}
 */
export async function retryWithBackoff(fn, maxRetries = 3, delay = 1000, backoffMultiplier = 2) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt < maxRetries) {
                const waitTime = delay * Math.pow(backoffMultiplier, attempt);
                await sleep(waitTime);
            }
        }
    }

    throw lastError;
}

/**
 * Find first matching item in array
 * @param {Array} array - Array to search
 * @param {Function} predicate - Predicate function
 * @returns {any|null}
 */
export function findFirst(array, predicate) {
    if (!Array.isArray(array)) return null;

    for (const item of array) {
        if (predicate(item)) {
            return item;
        }
    }

    return null;
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any}
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }

    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }

    return cloned;
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
