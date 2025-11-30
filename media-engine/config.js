import { ClientType } from './constants.js';

/**
 * Base Configuration
 */
export const Config = {
    BASE_URL: "https://music.youtube.com",
    API_KEY: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    USER_AGENT: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

/**
 * Client Contexts
 * Different client configurations for various compatibility scenarios
 */
export const ClientContexts = {
    [ClientType.WEB_REMIX]: {
        clientName: "WEB_REMIX",
        clientVersion: "1.20231122.01.00",
        platform: "DESKTOP",
        hl: "en",
        gl: "US",
        visitorData: "CgtEUlRINDFjdm1YayjX1pSaBg%3D%3D",
        userAgent: Config.USER_AGENT,
    },
    [ClientType.ANDROID_MUSIC]: {
        clientName: "ANDROID_MUSIC",
        clientVersion: "6.42.52",
        platform: "MOBILE",
        androidSdkVersion: 33,
        hl: "en",
        gl: "US",
        userAgent: "com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 13) gzip",
    },
    [ClientType.TV_EMBEDDED]: {
        clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
        clientVersion: "2.0",
        platform: "TV",
        hl: "en",
        gl: "US",
        userAgent: Config.USER_AGENT,
    },
    [ClientType.IOS]: {
        clientName: "IOS",
        clientVersion: "19.29.1",
        platform: "MOBILE",
        deviceMake: "Apple",
        deviceModel: "iPhone16,2",
        hl: "en",
        gl: "US",
        userAgent: "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)",
    },
    [ClientType.ANDROID]: {
        clientName: "ANDROID",
        clientVersion: "19.29.37",
        platform: "MOBILE",
        androidSdkVersion: 33,
        hl: "en",
        gl: "US",
        userAgent: "com.google.android.youtube/19.29.37 (Linux; U; Android 13) gzip",
    },
};

/**
 * Cache Configuration
 */
export const CacheConfig = {
    PLAYER_RESPONSE_TTL: 3600000, // 1 hour in milliseconds
    DECIPHER_FUNCTION_TTL: 86400000, // 24 hours in milliseconds
    PLAYER_CODE_TTL: 86400000, // 24 hours in milliseconds
    MAX_CACHE_SIZE: 100, // Maximum number of cached items
};

/**
 * Retry Configuration
 */
export const RetryConfig = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // milliseconds
    BACKOFF_MULTIPLIER: 2,
};

/**
 * Stream Configuration
 */
export const StreamConfig = {
    CHUNK_SIZE: 1024 * 1024, // 1MB chunks
    MAX_REDIRECTS: 5,
    TIMEOUT: 30000, // 30 seconds
};

/**
 * Client Priority Order
 * Order in which clients are tried for player requests
 */
export const ClientPriority = [
    ClientType.TV_EMBEDDED,
    ClientType.ANDROID,
    ClientType.IOS,
    ClientType.ANDROID_MUSIC,
    ClientType.WEB_REMIX,
];
