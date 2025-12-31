/**
 * Library view for downloaded songs and local music files
 */
import { useState } from 'react';
import { Music, Library, Play, Trash2, FolderOpen, RefreshCw, HardDrive, Download, FileAudio, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';

export default function LibraryView() {
    const {
        downloads, playSong, deleteDownload, localLibrary, importedFolders,
        isScanning, scanProgress, importMusicFolder, rescanLibrary, removeLocalSong,
    } = usePlayer();

    const [activeTab, setActiveTab] = useState('local');

    const totalSongs = localLibrary.length + downloads.length;

    return (
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-32">
            {/* Header */}
            <div className="p-6 rounded-2xl mb-6 bg-gradient-to-br from-purple-600 to-blue-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Library className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Your Library</h1>
                            <p className="text-white/70">
                                {totalSongs} {totalSongs === 1 ? 'song' : 'songs'} • {importedFolders.length} imported folder{importedFolders.length !== 1 && 's'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => rescanLibrary()} disabled={isScanning} className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all flex items-center gap-2 text-white disabled:opacity-50">
                            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Rescan</span>
                        </button>
                        <button onClick={() => importMusicFolder()} disabled={isScanning} className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all flex items-center gap-2 text-white disabled:opacity-50">
                            <FolderOpen className="w-4 h-4" />
                            <span className="hidden sm:inline">Import Folder</span>
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {isScanning && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 flex items-center gap-3 text-white/80">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">{scanProgress || 'Scanning...'}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {[
                    { id: 'local', label: 'Local Files', icon: HardDrive, count: localLibrary.length },
                    { id: 'downloads', label: 'Downloads', icon: Download, count: downloads.length }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-purple-600 text-white' : 'bg-neutral-800/50 text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{tab.count}</span>
                    </button> // Removed extra parenthesis here
                ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: activeTab === 'local' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: activeTab === 'local' ? 20 : -20 }}
                >
                    {activeTab === 'local' ? (
                        localLibrary.length === 0 ? (
                            <EmptyState icon={FileAudio} title="No local music found" desc="We'll automatically scan your Music folder. You can also import manually." action={importMusicFolder} btnText="Import Music Folder" disabled={isScanning} />
                        ) : (
                            <LocalSongsList songs={localLibrary} onPlay={playSong} onRemove={removeLocalSong} />
                        )
                    ) : (
                        downloads.length === 0 ? (
                            <EmptyState icon={Download} title="No downloads yet" desc="Download songs from the streaming library to listen offline." />
                        ) : (
                            <div className="space-y-1">
                                {downloads.map(song => (
                                    <SongRow key={song.videoId} song={song} onPlay={() => playSong(song, downloads)} onRemove={() => deleteDownload(song.videoId)} thumbnail={song.thumbnail?.url} />
                                ))}
                            </div>
                        )
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function EmptyState({ icon: Icon, title, desc, action, btnText, disabled }) {
    return (
        <div className="text-center mt-12 py-16 rounded-2xl bg-neutral-900/30 border border-neutral-800/50">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
                <Icon className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">{desc}</p>
            {action && (
                <button onClick={action} disabled={disabled} className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-500 hover:to-blue-500 transition-all flex items-center gap-2 mx-auto disabled:opacity-50">
                    <FolderOpen className="w-5 h-5" /> {btnText}
                </button>
            )}
        </div>
    );
}

function LocalSongsList({ songs, onPlay, onRemove }) {
    const songsByArtist = songs.reduce((acc, song) => {
        (acc[song.artist || 'Unknown Artist'] ||= []).push(song);
        return acc;
    }, {});
    const sortedArtists = Object.keys(songsByArtist).sort();
    const sortedSongs = sortedArtists.flatMap(artist => songsByArtist[artist]);

    return (
        <div className="space-y-6">
            {sortedArtists.map(artist => (
                <div key={artist}>
                    <h3 className="text-sm font-medium text-neutral-400 mb-3 px-1 sticky top-0 bg-neutral-950/80 backdrop-blur-sm py-2 z-10">
                        {artist} • {songsByArtist[artist].length} song{songsByArtist[artist].length !== 1 && 's'}
                    </h3>
                    <div className="space-y-1">
                        {songsByArtist[artist].map(song => (
                            <SongRow key={song.id} song={song} onPlay={() => onPlay(song, sortedSongs)} onRemove={() => onRemove(song.id)} thumbnail={song.thumbnail?.url} showFormat />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function SongRow({ song, onPlay, onRemove, thumbnail, showFormat }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 p-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-800/50 transition-colors group">
            <div onClick={onPlay} className="flex items-center gap-4 flex-1 cursor-pointer">
                {thumbnail ? (
                    <img src={thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                        <Music className="w-5 h-5 text-purple-400" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-white truncate group-hover:text-purple-400 transition-colors">{song.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                        <span className="truncate">{song.artist}</span>
                        {showFormat && song.format && <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-xs uppercase text-neutral-500">{song.format}</span>}
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
            </div>
            <button onClick={onRemove} className="p-2 text-neutral-500 hover:text-red-400 transition-colors shrink-0" title="Remove">
                <Trash2 className="w-4 h-4" />
            </button>
        </motion.div>
    );
}
