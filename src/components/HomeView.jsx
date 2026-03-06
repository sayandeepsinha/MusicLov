import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, RefreshCw, WifiOff, Library, Music } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import SongCard from './SongCard';
import logger from '../common/logger';

export default function HomeView({ searchResults, setSearchResults, onLibraryClick }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [homeSongs, setHomeSongs] = useState([]);
    const [loadingHome, setLoadingHome] = useState(true);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Search enhancements
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [nextToken, setNextToken] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const { playSong } = usePlayer();

    const fetchHomeSongs = useCallback(async () => {
        if (!window.electronAPI || !navigator.onLine) return;
        setLoadingHome(true);
        try {
            // Read recent user listening history from IndexedDB
            const db = await import('../common/db');
            const historyIds = await db.getRecentHistoryVideoIds(10);

            // Fetch dynamic, personalized 50-song mix based on those history seeds
            const songs = await window.electronAPI.getPersonalizedMix(historyIds, 50);

            setHomeSongs(songs || []);
        } catch (err) {
            logger.error('HomeView', 'Failed to fetch personalized home songs', err);
        } finally {
            setLoadingHome(false);
        }
    }, []);

    useEffect(() => {
        fetchHomeSongs();

        // Listen to network status changes
        const handleOnline = () => { setIsOffline(false); fetchHomeSongs(); };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [fetchHomeSongs]);

    useEffect(() => {
        if (!query.trim() || isOffline) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            if (window.electronAPI) {
                try {
                    const results = await window.electronAPI.getSuggestions(query);
                    setSuggestions(results || []);
                } catch (err) {
                    logger.error('HomeView', 'Failed to fetch suggestions', err);
                }
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, isOffline]);

    const handleSearch = async (e, overrideQuery = null) => {
        if (e) e.preventDefault();
        const searchQuery = overrideQuery || query;
        if (!searchQuery.trim() || isOffline) return;

        setQuery(searchQuery);
        setShowSuggestions(false);
        setLoading(true);
        setNextToken(null);

        try {
            if (window.electronAPI) {
                const { songs, continuationToken } = await window.electronAPI.search(searchQuery);
                setSearchResults(songs || []);
                setNextToken(continuationToken);
            }
        } catch (error) {
            logger.error('HomeView', 'Search failed', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreSearchResults = useCallback(async () => {
        // If we are not currently viewing search results, DO NOT fetch more
        if (!nextToken || loadingMore || isOffline || !window.electronAPI || !searchResults || searchResults.length === 0) return;

        setLoadingMore(true);
        try {
            const { songs, continuationToken } = await window.electronAPI.search(query, nextToken);
            if (songs && songs.length > 0) {
                setSearchResults(prev => [...(prev || []), ...songs]);
            }
            setNextToken(continuationToken);
        } catch (error) {
            logger.error('HomeView', 'Failed to load more search results', error);
        } finally {
            setLoadingMore(false);
        }
    }, [nextToken, loadingMore, isOffline, query, searchResults, setSearchResults]);

    useEffect(() => {
        // If we're not showing search results, don't observe anything to prevent ghost fetches
        if (!searchResults || searchResults.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreSearchResults();
                }
            },
            { threshold: 0.1 }
        );

        const target = document.getElementById('search-load-more');
        if (target) observer.observe(target);

        return () => {
            if (target) observer.unobserve(target);
            observer.disconnect();
        };
    }, [loadMoreSearchResults, searchResults]);

    if (isOffline) {
        return (
            <div className="max-w-5xl mx-auto flex flex-col items-center justify-center p-12 mt-20 bg-white rounded-3xl border border-blue-100 shadow-sm text-center">
                <div className="p-6 bg-blue-50 text-blue-400 rounded-full mb-6 relative">
                    <WifiOff className="w-16 h-16" />
                    <div className="absolute -top-2 -right-2 p-3 bg-red-100 text-red-500 rounded-full animate-pulse">
                        <Music className="w-6 h-6" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-3 tracking-tight">You're Offline!</h1>
                <p className="text-gray-500 max-w-sm mb-8 text-lg">
                    The connection is lost, but the melody doesn't have to stop. Head over to your library to play downloaded songs.
                </p>
                <button onClick={onLibraryClick} className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-200 transition transform hover:-translate-y-1">
                    <Library className="w-6 h-6" />
                    Go to Library
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <div className="text-center mt-8 mb-2">
                <h1 className="text-4xl font-bold text-blue-600 mb-2">MusicLov</h1>
            </div>

            <div className="max-w-xl mx-auto w-full relative z-20">
                <form onSubmit={handleSearch} className={`flex items-center gap-2 bg-white p-1.5 shadow-sm border border-gray-200 focus-within:border-gray-300 focus-within:shadow transition-all duration-200 ${showSuggestions && suggestions.length > 0 ? 'rounded-t-2xl border-b-0 shadow-none' : 'rounded-2xl'}`}>
                    <Search className="w-5 h-5 text-gray-400 ml-3 shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Search for songs, artists..."
                        className="flex-1 bg-transparent border-none outline-none text-gray-800 px-2 py-2.5 text-lg"
                    />
                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition flex items-center justify-center shrink-0">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                    </button>
                </form>

                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-t-0 border-gray-200 rounded-b-2xl shadow-sm overflow-hidden group">
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                onClick={() => handleSearch(null, suggestion)}
                                className="px-5 py-3 text-gray-700 hover:bg-gray-50 cursor-pointer transition flex items-center gap-3"
                            >
                                <Search className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                {suggestion}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {searchResults && searchResults.length > 0 ? (
                <div className="mt-6 flex flex-col gap-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {searchResults.map((song, idx) => (
                            <SongCard key={`${song.videoId}-${idx}`} song={song} onClick={() => playSong(song, searchResults)} />
                        ))}
                    </div>
                    {/* Infinite Scroll Sentinel */}
                    <div id="search-load-more" className="w-full h-10 flex items-center justify-center">
                        {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-blue-500" />}
                    </div>
                </div>
            ) : (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-xl font-bold text-gray-800 tracking-tight">Quick Picks</h2>
                        <button
                            onClick={fetchHomeSongs}
                            disabled={loadingHome}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loadingHome ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                    {loadingHome ? (
                        <div className="flex justify-center my-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {homeSongs.map((song) => (
                                <SongCard
                                    key={`home-${song.videoId || song.id}`}
                                    song={song}
                                    onClick={() => playSong(song, homeSongs)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
