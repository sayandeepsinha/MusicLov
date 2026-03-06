const logger = require('./logger');

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
 * Parse songs and continuation from search response
 */
function parseSongsFromSearch(data) {
    const songs = [];
    let nextContinuationToken = null;

    // Check if it's a continuation response
    if (data?.continuationContents?.musicShelfContinuation) {
        const shelf = data.continuationContents.musicShelfContinuation;
        nextContinuationToken = shelf.continuations?.[0]?.nextContinuationData?.continuation;
        parseShelfContents(shelf.contents || [], songs);
    }
    // Or check if it's a continuation section list response
    else if (data?.continuationContents?.sectionListContinuation) {
        const shelf = data.continuationContents.sectionListContinuation.contents?.find(c => c.musicShelfRenderer)?.musicShelfRenderer;
        nextContinuationToken = shelf?.continuations?.[0]?.nextContinuationData?.continuation;
        parseShelfContents(shelf?.contents || [], songs);
    }
    // Otherwise it's an initial search response
    else {
        const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
        if (contents) {
            for (const section of contents) {
                const shelf = section.musicShelfRenderer;
                if (!shelf) continue;

                // Usually the first shelf with songs is what we want
                parseShelfContents(shelf.contents || [], songs);
                nextContinuationToken = shelf.continuations?.[0]?.nextContinuationData?.continuation || nextContinuationToken;
            }
        }
    }

    return { songs, continuationToken: nextContinuationToken };
}

function parseShelfContents(contents, songs) {
    for (const item of contents) {
        const renderer = item.musicResponsiveListItemRenderer;
        if (!renderer) continue;

        const videoId = renderer.playlistItemData?.videoId ||
            renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;

        if (!videoId) continue;

        const title = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        const artist = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];

        // Get the best thumbnail and keep its original resolution for the frontend to upgrade
        const originalUrl = thumbnails?.[thumbnails?.length - 1]?.url;

        songs.push({
            videoId,
            title,
            artist,
            authors: [{ name: artist }],
            thumbnail: {
                thumbnails: thumbnails,
                url: originalUrl,
            },
        });
    }
}

/**
 * Search for songs
 * @param {string} query - Search query
 * @param {string} continuationToken - Optional token for lazy loading more results
 * @returns {Promise<Object>} - { songs: Array, continuationToken: string }
 */
async function search(query, continuationToken = null) {
    logger.info('InnerTube', `Searching for: ${query} ${continuationToken ? '(Page 2+)' : ''}`);
    try {
        let body;
        if (continuationToken) {
            body = {
                context: { client: WEB_REMIX_CLIENT },
                continuation: continuationToken,
            };
        } else {
            body = {
                context: { client: WEB_REMIX_CLIENT },
                query: query,
                params: SearchFilter.Song,
            };
        }

        const data = await innertubeRequest('/youtubei/v1/search', body);
        const result = parseSongsFromSearch(data);
        logger.info('InnerTube', `Found ${result.songs.length} songs, NextToken: ${!!result.continuationToken}`);
        return result;
    } catch (error) {
        logger.error('InnerTube', 'Search failed:', error);
        return { songs: [], continuationToken: null };
    }
}

/**
 * Get Search Suggestions (Autocomplete)
 * @param {string} query
 * @returns {Promise<Array<string>>}
 */
async function getSuggestions(query) {
    try {
        const body = {
            context: { client: WEB_REMIX_CLIENT },
            input: query
        };
        const data = await innertubeRequest('/youtubei/v1/music/get_search_suggestions', body);
        const suggestions = data?.contents?.[0]?.searchSuggestionsSectionRenderer?.contents?.map(c =>
            c.searchSuggestionRenderer?.navigationEndpoint?.searchEndpoint?.query
        ).filter(Boolean);

        return suggestions || [];
    } catch (error) {
        logger.error('InnerTube', 'Get suggestions failed:', error);
        return [];
    }
}

/**
 * Browse/fetch songs for a category
 */
async function browse(query, limit = 30) {
    logger.info('InnerTube', `Browsing: ${query} limit: ${limit}`);
    try {
        const body = {
            context: { client: WEB_REMIX_CLIENT },
            query: query,
            params: SearchFilter.Song,
        };
        // Reuse search parsing (ignoring continuation for browse for now)
        const data = await innertubeRequest('/youtubei/v1/search', body);
        const result = parseSongsFromSearch(data);
        return result.songs.slice(0, limit);
    } catch (error) {
        logger.error('InnerTube', 'Browse failed:', error);
        return [];
    }
}

module.exports = {
    search,
    browse,
    getSuggestions,
    innertubeRequest,
    parseSongsFromSearch,
    INNERTUBE_API_KEY,
    SearchFilter,
    WEB_REMIX_CLIENT,
};
