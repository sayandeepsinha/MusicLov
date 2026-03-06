import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import SongCard from './SongCard';
import logger from '../common/logger';

export default function HomeView({ searchResults, setSearchResults }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [homeSongs, setHomeSongs] = useState([]);
    const [loadingHome, setLoadingHome] = useState(true);
    const { playSong } = usePlayer();

    useEffect(() => {
        let isMounted = true;
        const fetchHomeSongs = async () => {
            if (!window.electronAPI) return;
            try {
                // Read recent user listening history from IndexedDB
                const db = await import('../common/db');
                const historyIds = await db.getRecentHistoryVideoIds(10);

                // Fetch dynamic, personalized 50-song mix based on those history seeds
                const songs = await window.electronAPI.getPersonalizedMix(historyIds, 50);

                if (isMounted) {
                    setHomeSongs(songs || []);
                    setLoadingHome(false);
                }
            } catch (err) {
                logger.error('HomeView', 'Failed to fetch personalized home songs', err);
                if (isMounted) setLoadingHome(false);
            }
        };

        fetchHomeSongs();
        return () => { isMounted = false; };
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            if (window.electronAPI) {
                const songs = await window.electronAPI.search(query);
                setSearchResults(songs);
            }
        } catch (error) {
            logger.error('HomeView', 'Search failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <div className="text-center mt-8 mb-2">
                <h1 className="text-4xl font-bold text-blue-600 mb-2">MusicLov</h1>
            </div>

            <div className="max-w-xl mx-auto w-full">
                <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white rounded-full p-2 shadow-sm border border-blue-100 focus-within:border-blue-300 focus-within:shadow transition">
                    <Search className="w-5 h-5 text-gray-400 ml-3 shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for songs, artists..."
                        className="flex-1 bg-transparent border-none outline-none text-gray-800 px-2 py-3 text-lg"
                    />
                    <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-50 text-blue-700 rounded-full font-medium hover:bg-blue-100 transition flex items-center justify-center shrink-0">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                    </button>
                </form>
            </div>

            {searchResults && searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
                    {searchResults.map((song) => (
                        <SongCard key={song.videoId} song={song} onClick={() => playSong(song, searchResults)} />
                    ))}
                </div>
            ) : (
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 px-2 tracking-tight">Quick Picks</h2>
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
