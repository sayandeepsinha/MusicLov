/**
 * Browse view for showing songs from a category
 */
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import SongCard from './SongCard';
import logger from '../common/logger';

export default function BrowseView({ category, onBack }) {
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const { playSong } = usePlayer();
    const Icon = category.icon;

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
                logger.error('BrowseView', 'Failed to fetch category', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSongs();
    }, [category]);

    return (
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <div className={`p-6 rounded-2xl border flex items-center gap-4 ${category.color}`}>
                <div className="p-4 bg-white/60 rounded-xl">
                    <Icon className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">{category.title}</h1>
                    <p className="text-sm opacity-80">Top trending songs</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center mt-12">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
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
