import { useState } from 'react';
import { Search, Loader2, Star, Globe, TrendingUp, Flame } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import SongCard from './SongCard';
import CategoryTile from './CategoryTile';
import logger from '../common/logger';

const CATEGORIES = [
    { id: 'hindi', title: 'Top Hindi', query: 'Bollywood hits songs 2024', icon: Star, color: 'bg-orange-50 text-orange-600 border-orange-100', limit: 30 },
    { id: 'english', title: 'Top English', query: 'Billboard Hot 100 songs English pop', icon: Globe, color: 'bg-indigo-50 text-indigo-600 border-indigo-100', limit: 30 },
    { id: 'global', title: 'Global Top 50', query: 'Spotify top 50 global hits 2024', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', limit: 50 },
    { id: 'trending', title: 'Trending Now', query: 'viral trending songs 2024', icon: Flame, color: 'bg-rose-50 text-rose-600 border-rose-100', limit: 30 },
];

export default function HomeView({ onCategoryClick, searchResults, setSearchResults }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const { playSong } = usePlayer();

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
                <div className="grid grid-cols-2 gap-4 mt-6 max-w-2xl mx-auto w-full">
                    {CATEGORIES.map((category) => (
                        <CategoryTile
                            key={category.id}
                            category={category}
                            onClick={() => onCategoryClick(category)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
