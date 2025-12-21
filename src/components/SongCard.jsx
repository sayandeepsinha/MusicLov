/**
 * Song card component for displaying individual songs
 */
import { Play, Music } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SongCard({ song, onClick }) {
    const getHighResThumbnail = (url) => {
        if (!url) return null;
        return url.replace(/w\d+-h\d+/, 'w544-h544');
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onClick}
            className="group relative bg-neutral-900/50 border border-white/5 hover:border-purple-500/50 rounded-xl p-3 cursor-pointer hover:bg-neutral-800/50 transition-all duration-300"
        >
            <div className="flex flex-col gap-3">
                <div className="relative aspect-square">
                    {song.thumbnail?.url ? (
                        <img
                            src={getHighResThumbnail(song.thumbnail.url)}
                            alt={song.title}
                            className="w-full h-full rounded-lg object-cover shadow-lg"
                        />
                    ) : (
                        <div className="w-full h-full rounded-lg bg-neutral-800 flex items-center justify-center">
                            <Music className="w-10 h-10 text-neutral-600" />
                        </div>
                    )}
                    <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center shadow-lg hover:scale-110 transition-all">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                </div>
                <div className="min-w-0">
                    <h3 className="font-semibold text-white line-clamp-2 group-hover:text-purple-400 transition-colors text-sm">
                        {song.title}
                    </h3>
                    <p className="text-xs text-neutral-400 truncate mt-1">{song.artist}</p>
                </div>
            </div>
        </motion.div>
    );
}
