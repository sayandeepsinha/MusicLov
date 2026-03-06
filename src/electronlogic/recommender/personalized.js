const logger = require('../services/logger');
const { getRecommendations } = require('./contextual');

// Fallback seed if the user has no history (e.g., first open)
const FALLBACK_SEED = '4NRXx6U8ABQ'; // "Blinding Lights"

/**
 * Shuffles an array in place using Fisher-Yates algorithm.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Get a personalized mix of songs based on the user's recent listening history.
 * This is Layer 2: History Recommender. Used to power the Home Page "Quick Picks" grid.
 * 
 * @param {string[]} historyIds - Array of recent video IDs the user has played.
 * @param {number} limit - The total number of mixed recommendations to return.
 * @returns {Promise<Array>} A shuffled, diverse mix of personalized songs.
 */
async function getPersonalizedMix(historyIds = [], limit = 50) {
    logger.info('RecommenderPersonalized', `Generating custom mix. History count: ${historyIds.length}`);

    // Determine seeds to use for building the mix
    let seeds = [];
    if (!historyIds || historyIds.length === 0) {
        // First-time user: generate generic popular grid
        seeds = [FALLBACK_SEED];
    } else {
        // Returning user: randomly pick 1-3 distinct tracks from their recent history to ensure genre variety
        const maxSeeds = Math.min(3, historyIds.length);
        const shuffledHistory = shuffleArray([...historyIds]);
        seeds = shuffledHistory.slice(0, maxSeeds);
    }

    logger.info('RecommenderPersonalized', `Using seeds for custom mix: ${seeds.join(', ')}`);

    try {
        // Fetch recommendations for all chosen seeds in parallel
        const mixPromises = seeds.map(seedId => getRecommendations(seedId, 30));
        const mixResults = await Promise.all(mixPromises);

        // Combine all results into a single pool
        let mixedPool = [];
        mixResults.forEach(batch => {
            if (batch && batch.length) {
                mixedPool = mixedPool.concat(batch);
            }
        });

        // Deduplicate tracks (Youtube often recommends the same viral songs across different radios)
        const uniqueMix = [];
        const seenIds = new Set(seeds); // Avoid recommending the exact seeds themselves if possible

        for (const song of mixedPool) {
            if (!seenIds.has(song.videoId)) {
                seenIds.add(song.videoId);
                uniqueMix.push(song);
            }
        }

        // Shuffle the final unique mix so it feels like a cohesive "radio" rather than chunks of genres
        const finalMix = shuffleArray(uniqueMix).slice(0, limit);

        logger.info('RecommenderPersonalized', `Successfully generated personalized mix of ${finalMix.length} tracks`);
        return finalMix;

    } catch (error) {
        logger.error('RecommenderPersonalized', 'Failed to generate personalized mix:', error);
        return [];
    }
}

module.exports = { getPersonalizedMix };
