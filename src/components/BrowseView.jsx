/**
 * Browse view for showing songs from a category
 */
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import SongCard from './SongCard';

export default function BrowseView({ category, onBack }) {
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const { playSong } = usePlayer();
    const Icon = category.icon;

    // Fetch songs when category changes
    useEffect(() => {
        const fetchSongs = async () => {
            setLoading(true);
            try {
                if (window.electronAPI) {
                    const results = await window.electronAPI.browse({
                        query: category.query,
                        limit: category.limit || 30
                    });
                    setSongs(results);
                }
            } catch (error) {
                console.error('Failed to fetch category:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSongs();
    }, [category]);

    return (
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-32">
            {/* Category Header */}
            <div className={`p-6 rounded-2xl mb-6 bg-gradient-to-br ${category.color}`}>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                        <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{category.title}</h1>
                        <p className="text-white/70">Top trending songs</p>
                    </div>
                </div>
            </div>

            {/* Songs Grid */}
            {loading ? (
                <div className="flex justify-center mt-20">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {songs.map((song) => (
                        <SongCard key={song.videoId} song={song} onClick={() => playSong(song, songs)} />
                    ))}
                </div>
            )}
        </div>
    );
}
