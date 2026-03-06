const logger = require('../services/logger');
const { innertubeRequest, WEB_REMIX_CLIENT } = require('../services/innertube');
const { parseRecommendations } = require('./parser');

/**
 * Get recommendations based on a precise seed song using YouTube Music's Radio (Automix) feature.
 * This is Layer 1: Contextual Recommender. Used to seamlessly continue the "Up Next" queue in Player.
 * 
 * @param {string} videoId - The strict seed video ID.
 * @param {number} limit - The maximum number of recommendations to return.
 * @returns {Promise<Array>} List of structurally related songs.
 */
async function getRecommendations(videoId, limit = 20) {
    logger.info('RecommenderContextual', `Fetching radio recommendations for ${videoId}`);

    const body = {
        context: {
            client: WEB_REMIX_CLIENT
        },
        enableMdxAutoplay: true,
        isAudioOnly: true,
        tunerSettingValue: 'AUTOMIX_SETTING_NORMAL',
        videoId: videoId,
        playlistId: `RDAMVM${videoId}` // RDAMVM prefix triggers the exact track genre radio
    };

    try {
        const data = await innertubeRequest('/youtubei/v1/next', body);
        const allSongs = parseRecommendations(data, limit + 1); // +1 because the first song is the seed itself

        // Remove the seed song itself if it appears at the top
        const recommendations = allSongs.filter(s => s.videoId !== videoId).slice(0, limit);

        logger.info('RecommenderContextual', `Found ${recommendations.length} related songs`);
        return recommendations;
    } catch (error) {
        logger.error('RecommenderContextual', 'Failed to fetch recommendations:', error);
        return [];
    }
}

module.exports = { getRecommendations };
