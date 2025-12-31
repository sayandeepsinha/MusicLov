/**
 * Home view with search and category tiles
 */
import { useState } from 'react';
import { Search, Loader2, Star, Globe, TrendingUp, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import SongCard from './SongCard';
import CategoryTile from './CategoryTile';

const CATEGORIES = [
    { id: 'hindi', title: 'Top Hindi', query: 'Bollywood hits songs 2024', icon: Star, color: 'from-orange-500 to-pink-500', limit: 30 },
    { id: 'english', title: 'Top English', query: 'Billboard Hot 100 songs English pop', icon: Globe, color: 'from-blue-500 to-purple-500', limit: 30 },
    { id: 'global', title: 'Global Top 50', query: 'Spotify top 50 global hits 2024', icon: TrendingUp, color: 'from-green-500 to-teal-500', limit: 50 },
    { id: 'trending', title: 'Trending Now', query: 'viral trending songs 2024', icon: Flame, color: 'from-red-500 to-orange-500', limit: 30 },
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
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-32">
            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mb-6"
            >
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent tracking-tight">
                    MusicLov
                </h1>
                <p className="text-neutral-400 text-sm">Stream your favorite tracks, ad-free.</p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-8 max-w-2xl mx-auto"
            >
                <form onSubmit={handleSearch} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition-opacity duration-500" />
                    <div className="relative flex items-center bg-neutral-900/80 border border-white/10 rounded-full p-2 backdrop-blur-xl shadow-2xl transition-all group-hover:border-white/20">
                        <Search className="w-5 h-5 text-neutral-400 ml-4" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search for songs, artists..."
                            className="w-full bg-transparent border-none outline-none text-white placeholder-neutral-500 px-4 py-2"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-white text-black px-5 py-2 rounded-full font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                        </button>
                    </div>
                </form>
            </motion.div>

            {/* Search Results */}
            {searchResults && searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {searchResults.map((song) => (
                        <SongCard key={song.videoId} song={song} onClick={() => playSong(song, searchResults)} />
                    ))}
                </div>
            ) : (
                /* Category Tiles */
                <div className="grid grid-cols-2 gap-4">
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
