/**
 * Library view for downloaded songs
 */
import { Music, Library, Play, Trash2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function LibraryView() {
    const { downloads, playSong, deleteDownload } = usePlayer();

    if (downloads.length === 0) {
        return (
            <div className="max-w-5xl mx-auto px-4 pt-4 pb-32">
                <div className="p-6 rounded-2xl mb-6 bg-gradient-to-br from-purple-600 to-blue-600">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                            <Library className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Your Library</h1>
                            <p className="text-white/70">Downloaded songs for offline playback</p>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-20">
                    <Music className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">No downloads yet</h2>
                    <p className="text-neutral-400">Download songs to listen offline</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-32">
            <div className="p-6 rounded-2xl mb-6 bg-gradient-to-br from-purple-600 to-blue-600">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                        <Library className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Your Library</h1>
                        <p className="text-white/70">{downloads.length} downloaded songs</p>
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                {downloads.map((song) => (
                    <div
                        key={song.videoId}
                        className="flex items-center gap-4 p-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-800/50 transition-colors group"
                    >
                        <div
                            onClick={() => playSong(song)}
                            className="flex items-center gap-4 flex-1 cursor-pointer"
                        >
                            {song.thumbnail?.url ? (
                                <img src={song.thumbnail.url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                            ) : (
                                <div className="w-14 h-14 rounded-lg bg-neutral-800 flex items-center justify-center">
                                    <Music className="w-6 h-6 text-neutral-600" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-white truncate group-hover:text-purple-400 transition-colors">{song.title}</h3>
                                <p className="text-sm text-neutral-400 truncate">{song.artist}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                            </div>
                        </div>
                        <button
                            onClick={() => deleteDownload(song.videoId)}
                            className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
