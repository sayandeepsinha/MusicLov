import { getNestedValue, findFirst } from './utils/helpers.js';

/**
 * ResponseParser - Parses complex YouTube API responses
 */
export class ResponseParser {
    /**
     * Parse search results from YouTube Music API response
     * @param {Object} response - API response
     * @returns {Array} Parsed search results
     */
    static parseSearchResults(response) {
        const results = [];

        try {
            const contents = getNestedValue(
                response,
                'contents.tabbedSearchResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.contents',
                []
            );

            for (const section of contents) {
                const items = getNestedValue(
                    section,
                    'musicShelfRenderer.contents',
                    []
                );

                for (const item of items) {
                    const parsed = this.parseMusicItem(item);
                    if (parsed) {
                        results.push(parsed);
                    }
                }
            }
        } catch (error) {
            console.error('Error parsing search results:', error);
        }

        return results;
    }

    /**
     * Parse a single music item (song, video, album, etc.)
     * @param {Object} item - Music item renderer
     * @returns {Object|null} Parsed item
     */
    static parseMusicItem(item) {
        const renderer = item.musicResponsiveListItemRenderer;
        if (!renderer) return null;

        try {
            // Extract video ID
            const videoId = getNestedValue(
                renderer,
                'playlistItemData.videoId',
                null
            ) || getNestedValue(
                renderer,
                'overlay.musicItemThumbnailOverlayRenderer.content.musicPlayButtonRenderer.playNavigationEndpoint.watchEndpoint.videoId',
                null
            );

            // Extract title
            const title = getNestedValue(
                renderer,
                'flexColumns.0.musicResponsiveListItemFlexColumnRenderer.text.runs.0.text',
                'Unknown'
            );

            // Extract artist/album info
            const flexColumn1 = getNestedValue(
                renderer,
                'flexColumns.1.musicResponsiveListItemFlexColumnRenderer.text.runs',
                []
            );

            let artist = 'Unknown Artist';
            let album = null;
            let duration = null;

            // Parse secondary info (artist, album, duration)
            if (flexColumn1.length > 0) {
                artist = flexColumn1[0]?.text || 'Unknown Artist';

                // Album is usually the 3rd item (index 2)
                if (flexColumn1.length > 2) {
                    album = flexColumn1[2]?.text;
                }
            }

            // Extract duration from fixed column
            const fixedColumn = getNestedValue(
                renderer,
                'fixedColumns.0.musicResponsiveListItemFixedColumnRenderer.text.runs.0.text',
                null
            );
            if (fixedColumn) {
                duration = fixedColumn;
            }

            // Extract thumbnails
            const thumbnails = this.extractThumbnails(
                getNestedValue(renderer, 'thumbnail.musicThumbnailRenderer.thumbnail.thumbnails', [])
            );

            return {
                videoId,
                title,
                artist,
                album,
                duration,
                thumbnails,
                type: this.detectItemType(renderer),
            };
        } catch (error) {
            console.error('Error parsing music item:', error);
            return null;
        }
    }

    /**
     * Detect item type (song, video, album, etc.)
     * @param {Object} renderer - Item renderer
     * @returns {string}
     */
    static detectItemType(renderer) {
        const navigationEndpoint = getNestedValue(
            renderer,
            'overlay.musicItemThumbnailOverlayRenderer.content.musicPlayButtonRenderer.playNavigationEndpoint',
            {}
        );

        if (navigationEndpoint.watchEndpoint) {
            return 'song';
        } else if (navigationEndpoint.watchPlaylistEndpoint) {
            return 'playlist';
        }

        return 'unknown';
    }

    /**
     * Extract and sort thumbnails by quality
     * @param {Array} thumbnails - Thumbnail array from API
     * @returns {Array} Sorted thumbnails (highest quality first)
     */
    static extractThumbnails(thumbnails) {
        if (!Array.isArray(thumbnails)) return [];

        return thumbnails
            .map(thumb => ({
                url: thumb.url,
                width: thumb.width,
                height: thumb.height,
            }))
            .sort((a, b) => (b.width * b.height) - (a.width * a.height));
    }

    /**
     * Parse player response
     * @param {Object} response - Player API response
     * @returns {Object} Parsed player data
     */
    static parsePlayerResponse(response) {
        try {
            const videoDetails = response.videoDetails || {};
            const streamingData = response.streamingData || {};
            const playabilityStatus = response.playabilityStatus || {};

            return {
                videoId: videoDetails.videoId,
                title: videoDetails.title,
                author: videoDetails.author,
                lengthSeconds: videoDetails.lengthSeconds,
                thumbnails: this.extractThumbnails(videoDetails.thumbnail?.thumbnails || []),
                streamingData: {
                    formats: streamingData.formats || [],
                    adaptiveFormats: streamingData.adaptiveFormats || [],
                    expiresInSeconds: streamingData.expiresInSeconds,
                },
                playabilityStatus: {
                    status: playabilityStatus.status,
                    reason: playabilityStatus.reason,
                    playableInEmbed: playabilityStatus.playableInEmbed,
                },
            };
        } catch (error) {
            console.error('Error parsing player response:', error);
            throw error;
        }
    }

    /**
     * Parse browse response (home, playlists, etc.)
     * @param {Object} response - Browse API response
     * @returns {Object} Parsed browse data
     */
    static parseBrowseResponse(response) {
        try {
            const contents = getNestedValue(
                response,
                'contents.singleColumnBrowseResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.contents',
                []
            );

            const sections = [];

            for (const section of contents) {
                if (section.musicCarouselShelfRenderer) {
                    sections.push(this.parseCarouselShelf(section.musicCarouselShelfRenderer));
                } else if (section.musicShelfRenderer) {
                    sections.push(this.parseMusicShelf(section.musicShelfRenderer));
                }
            }

            return { sections };
        } catch (error) {
            console.error('Error parsing browse response:', error);
            return { sections: [] };
        }
    }

    /**
     * Parse carousel shelf
     * @param {Object} shelf - Carousel shelf renderer
     * @returns {Object}
     */
    static parseCarouselShelf(shelf) {
        const title = getNestedValue(shelf, 'header.musicCarouselShelfBasicHeaderRenderer.title.runs.0.text', 'Unknown');
        const items = (shelf.contents || []).map(item => this.parseMusicItem(item)).filter(Boolean);

        return {
            type: 'carousel',
            title,
            items,
        };
    }

    /**
     * Parse music shelf
     * @param {Object} shelf - Music shelf renderer
     * @returns {Object}
     */
    static parseMusicShelf(shelf) {
        const title = getNestedValue(shelf, 'title.runs.0.text', 'Unknown');
        const items = (shelf.contents || []).map(item => this.parseMusicItem(item)).filter(Boolean);

        return {
            type: 'shelf',
            title,
            items,
        };
    }
}
