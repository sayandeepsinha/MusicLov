const logger = require('../services/logger');

/**
 * Parses the raw Next API response into a clean list of songs.
 */
function parseRecommendations(data, limit = 20) {
    const songs = [];

    try {
        const tab = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer;

        if (!tab) return songs;

        const contents = tab.content?.playlistPanelRenderer?.contents || [];

        for (const item of contents) {
            if (songs.length >= limit) break;

            const renderer = item.playlistPanelVideoRenderer;
            if (!renderer) continue;

            const videoId = renderer.videoId;
            if (!videoId) continue;

            const title = renderer.title?.runs?.[0]?.text;
            const artist = renderer.longBylineText?.runs?.[0]?.text;
            const thumbnails = renderer.thumbnail?.thumbnails || [];

            // Get the best thumbnail and keep its original resolution for the frontend to upgrade
            const originalUrl = thumbnails[thumbnails.length - 1]?.url;

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
    } catch (e) {
        logger.error('RecommenderParser', 'Error parsing recommendations:', e);
    }

    return songs;
}

module.exports = { parseRecommendations };
