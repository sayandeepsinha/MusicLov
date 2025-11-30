import { CacheConfig } from '../config.js';

/**
 * Simple in-memory cache with TTL support
 */
class Cache {
    constructor() {
        this.store = new Map();
        this.timestamps = new Map();
    }

    /**
     * Set a value in cache with optional TTL
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    set(key, value, ttl = CacheConfig.PLAYER_RESPONSE_TTL) {
        // Enforce max cache size
        if (this.store.size >= CacheConfig.MAX_CACHE_SIZE) {
            this.evictOldest();
        }

        this.store.set(key, value);
        this.timestamps.set(key, {
            createdAt: Date.now(),
            ttl: ttl,
        });
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null if not found/expired
     */
    get(key) {
        if (!this.store.has(key)) {
            return null;
        }

        const timestamp = this.timestamps.get(key);
        const now = Date.now();

        // Check if expired
        if (now - timestamp.createdAt > timestamp.ttl) {
            this.delete(key);
            return null;
        }

        return this.store.get(key);
    }

    /**
     * Check if key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Delete a key from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        this.store.delete(key);
        this.timestamps.delete(key);
    }

    /**
     * Clear all cache
     */
    clear() {
        this.store.clear();
        this.timestamps.clear();
    }

    /**
     * Evict oldest entry
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, timestamp] of this.timestamps.entries()) {
            if (timestamp.createdAt < oldestTime) {
                oldestTime = timestamp.createdAt;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.delete(oldestKey);
        }
    }

    /**
     * Get cache size
     * @returns {number}
     */
    size() {
        return this.store.size;
    }
}

// Export singleton instance
export const cache = new Cache();
