/**
 * Search Filter Parameters
 * These are base64-encoded filter parameters used by YouTube Music API
 */
export const SearchFilter = {
    SONG: "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D",
    VIDEO: "EgWKAQIQAWoKEAkQChAFEAMQBA%3D%3D",
    ALBUM: "EgWKAQIYAWoKEAkQChAFEAMQBA%3D%3D",
    ARTIST: "EgWKAQIgAWoKEAkQChAFEAMQBA%3D%3D",
    COMMUNITY_PLAYLIST: "EgeKAQQoAEABagoQAxAEEAoQCRAF",
    FEATURED_PLAYLIST: "EgeKAQQoADgBagwQDhAKEAMQBRAJEAQ%3D",
};

/**
 * Client Types
 * Different client contexts for various use cases
 */
export const ClientType = {
    WEB_REMIX: "WEB_REMIX",
    ANDROID_MUSIC: "ANDROID_MUSIC",
    TV_EMBEDDED: "TV_EMBEDDED",
    IOS: "IOS",
    ANDROID: "ANDROID",
};

/**
 * API Endpoints
 */
export const Endpoint = {
    BROWSE: "/youtubei/v1/browse",
    NEXT: "/youtubei/v1/next",
    PLAYER: "/youtubei/v1/player",
    SEARCH: "/youtubei/v1/search",
    SEARCH_SUGGESTIONS: "/youtubei/v1/music/get_search_suggestions",
};

/**
 * Error Codes
 */
export const ErrorCode = {
    NETWORK_ERROR: "NETWORK_ERROR",
    API_ERROR: "API_ERROR",
    PARSE_ERROR: "PARSE_ERROR",
    NO_STREAM_FOUND: "NO_STREAM_FOUND",
    CIPHER_ERROR: "CIPHER_ERROR",
    INVALID_VIDEO_ID: "INVALID_VIDEO_ID",
    PLAYABILITY_ERROR: "PLAYABILITY_ERROR",
};

/**
 * Format Types
 */
export const FormatType = {
    AUDIO: "audio",
    VIDEO: "video",
    AUDIO_VIDEO: "audio_video",
};

/**
 * Playability Status
 */
export const PlayabilityStatus = {
    OK: "OK",
    UNPLAYABLE: "UNPLAYABLE",
    LOGIN_REQUIRED: "LOGIN_REQUIRED",
    ERROR: "ERROR",
    LIVE_STREAM_OFFLINE: "LIVE_STREAM_OFFLINE",
};

/**
 * Cache Keys
 */
export const CacheKey = {
    PLAYER_RESPONSE: "player_response",
    DECIPHER_FUNCTION: "decipher_function",
    PLAYER_CODE: "player_code",
};
