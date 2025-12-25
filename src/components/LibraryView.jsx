/**
 * Library view for downloaded songs and local music files
 */
import { useState } from 'react';
import {
    Music,
    Library,
    Play,
    Trash2,
    FolderOpen,
    RefreshCw,
    HardDrive,
    Download,
    FileAudio,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';

export default function LibraryView() {
    const {
        downloads,
        playSong,
        deleteDownload,
        localLibrary,
        importedFolders,
        isScanning,
        scanProgress,
        importMusicFolder,
        rescanLibrary,
        removeLocalSong,
    } = usePlayer();

    const [activeTab, setActiveTab] = useState('local'); // 'local' | 'downloads'
    const [isImporting, setIsImporting] = useState(false);

    const handleImportFolder = async () => {
        setIsImporting(true);
        try {
            await importMusicFolder();
        } catch (error) {
            console.error('Import failed:', error);
        } finally {
            setIsImporting(false);
        }
    };

    const handleRescan = async () => {
        try {
            await rescanLibrary();
        } catch (error) {
            console.error('Rescan failed:', error);
        }
    };

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
                                {totalSongs} {totalSongs === 1 ? 'song' : 'songs'} • {importedFolders.length} imported {importedFolders.length === 1 ? 'folder' : 'folders'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleRescan}
                            disabled={isScanning}
                            className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all flex items-center gap-2 text-white disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Rescan</span>
                        </button>
                        <button
                            onClick={handleImportFolder}
                            disabled={isImporting || isScanning}
                            className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all flex items-center gap-2 text-white disabled:opacity-50"
                        >
                            <FolderOpen className="w-4 h-4" />
                            <span className="hidden sm:inline">Import Folder</span>
                        </button>
                    </div>
                </div>

                {/* Scanning Progress */}
                <AnimatePresence>
                    {isScanning && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 flex items-center gap-3 text-white/80"
                        >
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">{scanProgress || 'Scanning...'}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('local')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'local'
                        ? 'bg-purple-600 text-white'
                        : 'bg-neutral-800/50 text-neutral-400 hover:text-white hover:bg-neutral-800'
                        }`}
                >
                    <HardDrive className="w-4 h-4" />
                    Local Files
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                        {localLibrary.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('downloads')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'downloads'
                        ? 'bg-purple-600 text-white'
                        : 'bg-neutral-800/50 text-neutral-400 hover:text-white hover:bg-neutral-800'
                        }`}
                >
                    <Download className="w-4 h-4" />
                    Downloads
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                        {downloads.length}
                    </span>
                </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'local' ? (
                    <motion.div
                        key="local"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        {localLibrary.length === 0 ? (
                            <EmptyLocalState onImport={handleImportFolder} isImporting={isImporting} />
                        ) : (
                            <LocalSongsList
                                songs={localLibrary}
                                onPlay={playSong}
                                onRemove={removeLocalSong}
                            />
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="downloads"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        {downloads.length === 0 ? (
                            <EmptyDownloadsState />
                        ) : (
                            <DownloadsList
                                downloads={downloads}
                                onPlay={playSong}
                                onDelete={deleteDownload}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function EmptyLocalState({ onImport, isImporting }) {
    return (
        <div className="text-center mt-12 py-16 rounded-2xl bg-neutral-900/30 border border-neutral-800/50">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
                <FileAudio className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No local music found</h2>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
                We'll automatically scan your Music folder on first launch.
                You can also import music from any folder.
            </p>
            <button
                onClick={onImport}
                disabled={isImporting}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-500 hover:to-blue-500 transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
            >
                <FolderOpen className="w-5 h-5" />
                Import Music Folder
            </button>
        </div>
    );
}

function EmptyDownloadsState() {
    return (
        <div className="text-center mt-12 py-16 rounded-2xl bg-neutral-900/30 border border-neutral-800/50">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">
                <Download className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No downloads yet</h2>
            <p className="text-neutral-400 max-w-md mx-auto">
                Download songs from the streaming library to listen offline.
                Downloaded songs will appear here.
            </p>
        </div>
    );
}

function LocalSongsList({ songs, onPlay, onRemove }) {
    // Group songs by artist for display (UI only)
    const songsByArtist = songs.reduce((acc, song) => {
        const artist = song.artist || 'Unknown Artist';
        if (!acc[artist]) acc[artist] = [];
        acc[artist].push(song);
        return acc;
    }, {});

    // Sort artists alphabetically
    const sortedArtists = Object.keys(songsByArtist).sort();

    // Create a flat list of songs in the order they appear (Artist A -> Songs, Artist B -> Songs...)
    // This allows the queue to play through the library in a logical order
    const sortedSongs = sortedArtists.flatMap(artist => songsByArtist[artist]);

    return (
        <div className="space-y-6">
            {sortedArtists.map((artist) => (
                <div key={artist}>
                    <h3 className="text-sm font-medium text-neutral-400 mb-3 px-1 sticky top-0 bg-neutral-950/80 backdrop-blur-sm py-2 z-10">
                        {artist} • {songsByArtist[artist].length} {songsByArtist[artist].length === 1 ? 'song' : 'songs'}
                    </h3>
                    <div className="space-y-1">
                        {songsByArtist[artist].map((song) => (
                            <SongRow
                                key={song.id}
                                song={song}
                                onPlay={() => onPlay(song, sortedSongs)} // Pass the SORTED list as queue
                                onRemove={() => onRemove(song.id)}
                                showFormat
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function DownloadsList({ downloads, onPlay, onDelete }) {
    return (
        <div className="space-y-1">
            {downloads.map((song) => (
                <SongRow
                    key={song.videoId}
                    song={song}
                    onPlay={() => onPlay(song, downloads)} // Pass full downloads array as queue
                    onRemove={() => onDelete(song.videoId)}
                    thumbnail={song.thumbnail?.url}
                />
            ))}
        </div>
    );
}

function SongRow({ song, onPlay, onRemove, thumbnail, showFormat }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-800/50 transition-colors group"
        >
            <div
                onClick={onPlay}
                className="flex items-center gap-4 flex-1 cursor-pointer"
            >
                {thumbnail ? (
                    <img src={thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                        <Music className="w-5 h-5 text-purple-400" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-white truncate group-hover:text-purple-400 transition-colors">
                        {song.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                        <span className="truncate">{song.artist}</span>
                        {showFormat && song.format && (
                            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-xs uppercase text-neutral-500">
                                {song.format}
                            </span>
                        )}
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
            </div>
            <button
                onClick={onRemove}
                className="p-2 text-neutral-500 hover:text-red-400 transition-colors shrink-0"
                title="Remove from library"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </motion.div>
    );
}
