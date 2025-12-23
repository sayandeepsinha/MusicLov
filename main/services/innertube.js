/**
 * InnerTube API Service
 * Handles YouTube Music search and browse functionality
 */

const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const BASE_URL = 'https://music.youtube.com';

const SearchFilter = {
    Song: 'EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D',
    Video: 'EgWKAQIQAWoKEAkQChAFEAMQBA%3D%3D',
};

const WEB_REMIX_CLIENT = {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20220918',
    platform: 'DESKTOP',
    hl: 'en',
};

/**
 * Make a request to the InnerTube API
 */
async function innertubeRequest(endpoint, body = {}) {
    const url = `${BASE_URL}${endpoint}?key=${INNERTUBE_API_KEY}&prettyPrint=false`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

/**
 * Parse songs from search response
 */
function parseSongsFromSearch(data, limit = 20) {
    const songs = [];
    const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;

    if (contents) {
        for (const section of contents) {
            const shelfContents = section.musicShelfRenderer?.contents || [];
            for (const item of shelfContents) {
                if (songs.length >= limit) break;

                const renderer = item.musicResponsiveListItemRenderer;
                if (!renderer) continue;

                const videoId = renderer.playlistItemData?.videoId ||
                    renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;

                if (!videoId) continue;

                const title = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
                const artist = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
                const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;

                songs.push({
                    videoId,
                    title,
                    artist,
                    authors: [{ name: artist }],
                    thumbnail: {
                        thumbnails: thumbnails || [],
                        url: thumbnails?.[thumbnails?.length - 1]?.url,
                    },
                });
            }
            if (songs.length >= limit) break;
        }
    }
    return songs;
}

/**
 * Search for songs
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of song objects
 */
async function search(query) {
    console.log('[InnerTube] Searching for:', query);
    try {
        const body = {
            context: { client: WEB_REMIX_CLIENT },
            query: query,
            params: SearchFilter.Song,
        };
        const data = await innertubeRequest('/youtubei/v1/search', body);
        const songs = parseSongsFromSearch(data);
        console.log('[InnerTube] Found', songs.length, 'songs');
        return songs;
    } catch (error) {
        console.error('[InnerTube] Search failed:', error);
        return [];
    }
}

/**
 * Browse/fetch songs for a category
 * @param {string} query - Category query
 * @param {number} limit - Maximum number of songs to return
 * @returns {Promise<Array>} - Array of song objects
 */
async function browse(query, limit = 30) {
    console.log('[InnerTube] Browsing:', query, 'limit:', limit);
    try {
        const body = {
            context: { client: WEB_REMIX_CLIENT },
            query: query,
            params: SearchFilter.Song,
        };
        const data = await innertubeRequest('/youtubei/v1/search', body);
        const songs = parseSongsFromSearch(data, limit);
        console.log('[InnerTube] Found', songs.length, 'songs for', query);
        return songs;
    } catch (error) {
        console.error('[InnerTube] Browse failed:', error);
        return [];
    }
}

module.exports = {
    search,
    browse,
    innertubeRequest,
    parseSongsFromSearch,
    INNERTUBE_API_KEY,
    SearchFilter,
    WEB_REMIX_CLIENT,
};
