/**
 * Library view for downloaded songs and local music files
 */
import { useState } from 'react';
import { Music, Library, Play, Trash2, FolderOpen, RefreshCw, HardDrive, Download, FileAudio, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { upgradeThumbnailUrl } from '../common/thumbnailProvider';

export default function LibraryView() {
    const {
        downloads, playSong, deleteDownload, localLibrary, importedFolders,
        isScanning, scanProgress, importMusicFolder, rescanLibrary, removeLocalSong,
    } = usePlayer();

    const [activeTab, setActiveTab] = useState('local');

    const totalSongs = localLibrary.length + downloads.length;

    return (
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <div className="p-6 rounded-2xl border bg-white text-blue-900 border-blue-100 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-50 rounded-xl">
                            <Library className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Your Library</h1>
                            <p className="text-sm text-blue-600">
                                {totalSongs} {totalSongs === 1 ? 'song' : 'songs'} • {importedFolders.length} imported folder{importedFolders.length !== 1 && 's'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => rescanLibrary()} disabled={isScanning} className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition text-sm font-medium disabled:opacity-50 border border-blue-100 hover:border-blue-200">
                            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Rescan</span>
                        </button>
                        <button onClick={() => importMusicFolder()} disabled={isScanning} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium disabled:opacity-50">
                            <FolderOpen className="w-4 h-4" />
                            <span className="hidden sm:inline">Import Folder</span>
                        </button>
                    </div>
                </div>

                {isScanning && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{scanProgress || 'Scanning...'}</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2 border-b border-blue-100 pb-2">
                {[
                    { id: 'local', label: 'Local Files', icon: HardDrive, count: localLibrary.length },
                    { id: 'downloads', label: 'Downloads', icon: Download, count: downloads.length }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded-full border border-gray-100">{tab.count}</span>
                    </button>
                ))}
            </div>

            <div>
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
                        <div className="flex flex-col gap-2">
                            {downloads.map(song => (
                                <SongRow key={song.videoId} song={song} onPlay={() => playSong(song, downloads)} onRemove={() => deleteDownload(song.videoId)} thumbnail={song.thumbnail?.url} />
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

function EmptyState({ icon: Icon, title, desc, action, btnText, disabled }) {
    return (
        <div className="flex flex-col items-center text-center p-12 bg-white rounded-2xl border border-blue-50 shadow-sm mt-8">
            <div className="p-6 bg-blue-50 text-blue-400 rounded-full mb-4 border border-blue-100">
                <Icon className="w-12 h-12" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
            <p className="text-gray-500 max-w-sm mb-6">{desc}</p>
            {action && (
                <button onClick={action} disabled={disabled} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition disabled:opacity-50">
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
        <div className="flex flex-col gap-6">
            {sortedArtists.map(artist => (
                <div key={artist}>
                    <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-2 sticky top-0 bg-white/90 py-1 backdrop-blur-sm z-10">
                        {artist} • {songsByArtist[artist].length} song{songsByArtist[artist].length !== 1 && 's'}
                    </h3>
                    <div className="flex flex-col gap-1.5">
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
        <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-transparent hover:border-blue-100 hover:shadow-sm transition group">
            <div onClick={onPlay} className="flex-1 flex items-center gap-3 cursor-pointer min-w-0">
                {thumbnail ? (
                    <img
                        src={upgradeThumbnailUrl(thumbnail)}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = thumbnail;
                        }}
                        alt=""
                        className="w-12 h-12 rounded object-cover bg-gray-100"
                    />
                ) : (
                    <div className="w-12 h-12 rounded bg-blue-50 text-blue-300 border border-blue-100 flex items-center justify-center">
                        <Music className="w-6 h-6" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-600 transition">{song.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="truncate">{song.artist}</span>
                        {showFormat && song.format && <span className="px-1.5 bg-gray-100 text-gray-400 rounded text-[10px] uppercase font-bold">{song.format}</span>}
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition mr-2">
                    <Play className="w-4 h-4 ml-0.5 fill-current" />
                </div>
            </div>
            <button onClick={onRemove} title="Remove" className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}
