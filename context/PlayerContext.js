"use client";

import { createContext, useContext, useState } from "react";

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isLoadingQueue, setIsLoadingQueue] = useState(false);

    // Helper function to get best available thumbnail
    const getBestThumbnail = (thumbnails) => {
        if (!thumbnails || !Array.isArray(thumbnails) || thumbnails.length === 0) {
            return null;
        }
        // Try to get the highest quality thumbnail that exists
        // Thumbnails are usually ordered from low to high resolution
        const sortedThumbnails = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
        return sortedThumbnails[0]?.url || thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
    };

    const fetchRelatedSongs = async (videoId, playlistId, params) => {
        if (!videoId && !playlistId) return;
        setIsLoadingQueue(true);
        console.log("Fetching related songs for:", videoId, playlistId, params);

        try {
            let url = `/api/next?videoId=${videoId || ''}`;
            if (playlistId) url += `&playlistId=${playlistId}`;
            if (params) url += `&params=${params}`;

            const res = await fetch(url);
            const data = await res.json();

            // Find queue in any tab
            const tabs = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs;
            let queueItems = null;

            if (tabs) {
                for (const tab of tabs) {
                    const content = tab.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents;
                    if (content && content.length > 0) {
                        console.log(`Found queue in tab "${tab.tabRenderer?.title}" with ${content.length} items`);
                        queueItems = content;
                        break;
                    }
                }
            }

            if (queueItems && queueItems.length > 1) {
                const newSongs = queueItems
                    .slice(1) // Skip first item (current song)
                    .map(item => {
                        const renderer = item.playlistPanelVideoRenderer;
                        if (!renderer || !renderer.videoId) return null;

                        return {
                            videoId: renderer.videoId,
                            title: renderer.title?.runs?.[0]?.text,
                            authors: renderer.longBylineText?.runs?.filter(r => r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_ARTIST").map(r => ({ name: r.text })) || [],
                            thumbnail: {
                                thumbnails: renderer.thumbnail?.thumbnails || [],
                                url: getBestThumbnail(renderer.thumbnail?.thumbnails),
                                highRes: getBestThumbnail(renderer.thumbnail?.thumbnails?.slice(-2)), // Last 2 thumbnails
                                lowRes: renderer.thumbnail?.thumbnails?.[0]?.url
                            },
                            duration: renderer.lengthText?.runs?.[0]?.text
                        };
                    })
                    .filter(Boolean);

                console.log(`Parsed ${newSongs.length} unique songs from queue`);

                let finalQueueLength = 0;
                setQueue(prev => {
                    const existingIds = new Set(prev.map(s => s.videoId));
                    const uniqueNewSongs = newSongs.filter(s => !existingIds.has(s.videoId));
                    const newQueue = [...prev, ...uniqueNewSongs];
                    finalQueueLength = newQueue.length;
                    console.log(`Queue updated: ${prev.length} -> ${finalQueueLength} songs`);
                    return newQueue;
                });

                // If queue is still small and we haven't tried Radio yet, fetch more
                if (finalQueueLength < 10 && !playlistId) {
                    console.log("Queue is small, fetching Radio mix for more songs...");
                    setTimeout(() => fetchRelatedSongs(videoId, `RDAMVM${videoId}`), 500);
                }
            } else {
                // No queue found - try fallbacks
                console.log("No valid queue found, trying fallbacks...");

                if (!playlistId) {
                    // First fallback: Try Radio mix
                    console.log("Trying Radio mix (RDAMVM)...");
                    await fetchRelatedSongs(videoId, `RDAMVM${videoId}`);
                } else {
                    // Second fallback: Use search-based recommendations
                    console.log("Radio mix also failed, using search recommendations...");
                    await fetchRecommendations(videoId);
                }
            }
        } catch (error) {
            console.error("Failed to fetch related songs:", error);
            // On error, try search fallback
            if (!playlistId) {
                console.log("Error occurred, falling back to search recommendations...");
                await fetchRecommendations(videoId);
            }
        }

        setIsLoadingQueue(false);
    };

    const fetchRecommendations = async (videoId) => {
        if (!currentSong) return;

        try {
            const artist = currentSong.authors?.[0]?.name;
            if (artist) {
                // console.log(`Searching for recommendations for artist: ${artist}`);
                const res = await fetch(`/api/search?q=${encodeURIComponent(artist)}&type=Song`);
                const data = await res.json();

                // Parse search results
                let shelf = null;

                // Handle tabbed results (e.g. for Artist search)
                if (data?.contents?.tabbedSearchResultsRenderer) {
                    const tabs = data.contents.tabbedSearchResultsRenderer.tabs;
                    for (const tab of tabs) {
                        const content = tab.tabRenderer?.content?.sectionListRenderer?.contents;
                        if (content) {
                            // Find the "Songs" shelf
                            shelf = content.find(c => c.musicShelfRenderer?.title?.runs?.[0]?.text === "Songs")?.musicShelfRenderer;
                            // If not found, take the first musicShelfRenderer
                            if (!shelf) {
                                shelf = content.find(c => c.musicShelfRenderer)?.musicShelfRenderer;
                            }
                            if (shelf) break;
                        }
                    }
                }
                // Handle flat results (e.g. for Song search)
                else if (data?.contents?.sectionListRenderer) {
                    shelf = data.contents.sectionListRenderer.contents.find(c => c.musicShelfRenderer)?.musicShelfRenderer;
                }

                if (shelf) {
                    const songs = shelf.contents?.map(item => {
                        const renderer = item.musicResponsiveListItemRenderer;
                        if (!renderer) return null;

                        const videoId = renderer.playlistItemData?.videoId || renderer.doubleTapCommand?.watchEndpoint?.videoId;
                        if (!videoId) return null;

                        const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;

                        return {
                            videoId: videoId,
                            title: renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text,
                            authors: renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.filter(r => r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_ARTIST").map(r => ({ name: r.text })) || [{ name: artist }],
                            thumbnail: {
                                thumbnails: thumbnails || [],
                                url: getBestThumbnail(thumbnails),
                                highRes: getBestThumbnail(thumbnails?.slice(-2)),
                                lowRes: thumbnails?.[0]?.url
                            },
                            duration: renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.length - 1]?.text // Last run is usually duration
                        };
                    }).filter(Boolean);

                    if (songs && songs.length > 0) {
                        console.log(`Found ${songs.length} recommended songs`);
                        setQueue(prev => {
                            const existingIds = new Set(prev.map(s => s.videoId));
                            const uniqueNewSongs = songs.filter(s => !existingIds.has(s.videoId));
                            return [...prev, ...uniqueNewSongs];
                        });
                    } else {
                        console.log("No songs found in shelf.");
                    }
                } else {
                    console.log("No musicShelfRenderer found in search results.");
                }
            }
        } catch (e) {
            console.error("Recommendation fetch failed", e);
        }
    };

    const playSong = async (song) => {
        setCurrentSong(song);
        setIsPlaying(true);

        // Initialize queue with this song
        setQueue([song]);
        setCurrentIndex(0);

        // Fetch related songs - try multiple possible videoId fields
        const videoId = song.videoId || song.key || song.id;
        if (videoId) {
            fetchRelatedSongs(videoId);
        }
    };

    const playNext = () => {
        if (currentIndex < queue.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            setCurrentSong(queue[nextIndex]);
            setIsPlaying(true);
        }
    };

    const playPrevious = () => {
        if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            setCurrentSong(queue[prevIndex]);
            setIsPlaying(true);
        }
    };

    const pauseSong = () => {
        setIsPlaying(false);
    };

    const playQueueTrack = (index) => {
        if (index >= 0 && index < queue.length) {
            setCurrentIndex(index);
            setCurrentSong(queue[index]);
            setIsPlaying(true);
        }
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    return (
        <PlayerContext.Provider
            value={{
                currentSong,
                isPlaying,
                queue,
                currentIndex,
                isLoadingQueue,
                playSong,
                pauseSong,
                togglePlay,
                setIsPlaying,
                playNext,
                playPrevious,
                playQueueTrack,
                setQueue,
                addToQueue: (songs) => setQueue(prev => [...prev, ...songs])
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    return useContext(PlayerContext);
}
