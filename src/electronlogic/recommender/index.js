const logger = require('../services/logger');
const { innertubeRequest, WEB_REMIX_CLIENT, upgradeThumbnailUrl } = require('../services/innertube');

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

            // Get the best thumbnail and upgrade its resolution
            const originalUrl = thumbnails[thumbnails.length - 1]?.url;
            const highResUrl = upgradeThumbnailUrl(originalUrl);

            songs.push({
                videoId,
                title,
                artist,
                authors: [{ name: artist }],
                thumbnail: {
                    thumbnails: thumbnails,
                    url: highResUrl,
                },
            });
        }
    } catch (e) {
        logger.error('Recommender', 'Error parsing recommendations:', e);
    }

    return songs;
}

/**
 * Get recommendations based on a seed song using YouTube Music's Radio (Automix) feature.
 * @param {string} videoId - The seed video ID.
 * @param {number} limit - The maximum number of recommendations to return.
 * @returns {Promise<Array>} List of recommended songs.
 */
async function getRecommendations(videoId, limit = 20) {
    logger.info('Recommender', `Fetching recommendations for ${videoId}`);

    const body = {
        context: {
            client: WEB_REMIX_CLIENT
        },
        enableMdxAutoplay: true,
        isAudioOnly: true,
        tunerSettingValue: 'AUTOMIX_SETTING_NORMAL',
        videoId: videoId,
        playlistId: `RDAMVM${videoId}` // RDAMVM prefix triggers the generic track radio
    };

    try {
        const data = await innertubeRequest('/youtubei/v1/next', body);
        const allSongs = parseRecommendations(data, limit + 1); // +1 because the first song is the seed itself

        // Remove the seed song itself if it appears at the top
        const recommendations = allSongs.filter(s => s.videoId !== videoId).slice(0, limit);

        logger.info('Recommender', `Found ${recommendations.length} recommendations`);
        return recommendations;
    } catch (error) {
        logger.error('Recommender', 'Failed to fetch recommendations:', error);
        return [];
    }
}

module.exports = {
    getRecommendations
};
