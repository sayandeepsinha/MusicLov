import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getAllDownloads, deleteLocalSong } from '../common/db';
import * as libraryService from '../services/libraryService';
import * as downloadService from '../services/downloadService';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
    // Player state
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [audioUrl, setAudioUrl] = useState(null);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [downloads, setDownloads] = useState([]);

    // Local library state
    const [localLibrary, setLocalLibrary] = useState([]);
    const [importedFolders, setImportedFolders] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(null);

    // Ref to prevent duplicate scans (React 18 Strict Mode mounts twice in dev)
    const scanInitiatedRef = useRef(false);

    // Load downloads and local library from IndexedDB on mount
    useEffect(() => {
        getAllDownloads()
            .then(setDownloads)
            .catch(err => console.error('Failed to load downloads:', err));

        libraryService.loadLibraryData()
            .then(({ localLibrary: lib, importedFolders: folders }) => {
                setLocalLibrary(lib);
                setImportedFolders(folders);
            })
            .catch(err => console.error('Failed to load library data:', err));
    }, []);

    // Auto-scan default music folder on every app launch
    useEffect(() => {
        const autoScan = async () => {
            if (scanInitiatedRef.current) {
                console.log('[PlayerContext] Scan already initiated, skipping');
                return;
            }

            if (window.electronAPI) {
                scanInitiatedRef.current = true;
                console.log('[PlayerContext] Scanning default Music folder on launch');
                try {
                    await scanDefaultMusicFolder();
                } catch (err) {
                    console.error('Auto-scan failed:', err);
                    scanInitiatedRef.current = false;
                }
            }
        };
        autoScan();
    }, []);

    // ========== AUDIO PLAYBACK ==========

    const fetchAudioUrl = async (song) => {
        setIsLoadingAudio(true);
        try {
            const url = await downloadService.fetchAudioUrl(song, downloads);
            setAudioUrl(url);
            return url;
        } finally {
            setIsLoadingAudio(false);
        }
    };

    const playSong = async (song, relatedSongs = []) => {
        console.log('[PlayerContext] Playing song:', song.title);
        setAudioUrl(null);

        let newQueue = [];
        let newIndex = 0;

        if (relatedSongs.length > 0) {
            // Find the song index using multiple matching strategies:
            // 1. filePath for local songs (most reliable)
            // 2. videoId for streaming/downloaded songs
            // 3. id as fallback
            const index = relatedSongs.findIndex(s => {
                // For local songs, match by filePath (guaranteed unique)
                if (song.filePath && s.filePath) {
                    return s.filePath === song.filePath;
                }
                // For streaming/downloaded songs, match by videoId
                if (song.videoId && s.videoId) {
                    return s.videoId === song.videoId;
                }
                // Fallback to id
                if (song.id && s.id) {
                    return s.id === song.id;
                }
                return false;
            });

            if (index !== -1) {
                newQueue = [...relatedSongs];
                newIndex = index;
            } else {
                // Song not found in list, add it at the beginning
                newQueue = [song, ...relatedSongs];
                newIndex = 0;
            }
        } else {
            newQueue = [song];
            newIndex = 0;
        }

        setQueue(newQueue);
        setCurrentIndex(newIndex);
        setCurrentSong(song);
        setIsPlaying(true);

        await fetchAudioUrl(song);
    };

    const playNext = async () => {
        if (currentIndex < queue.length - 1) {
            const nextIndex = currentIndex + 1;
            const nextSong = queue[nextIndex];

            setAudioUrl(null);
            setCurrentIndex(nextIndex);
            setCurrentSong(nextSong);
            setIsPlaying(true);

            await fetchAudioUrl(nextSong);
        }
    };

    const playPrevious = async () => {
        if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            const prevSong = queue[prevIndex];

            setAudioUrl(null);
            setCurrentIndex(prevIndex);
            setCurrentSong(prevSong);
            setIsPlaying(true);

            await fetchAudioUrl(prevSong);
        }
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const playQueueTrack = async (index) => {
        if (index >= 0 && index < queue.length) {
            const song = queue[index];

            setAudioUrl(null);
            setCurrentIndex(index);
            setCurrentSong(song);
            setIsPlaying(true);

            await fetchAudioUrl(song);
        }
    };

    // ========== DOWNLOAD FUNCTIONS ==========

    const downloadSong = async (song) => {
        const result = await downloadService.downloadSong(song, downloads);
        if (result.success && result.downloadedSong) {
            setDownloads(prev => [...prev, result.downloadedSong]);
        }
        return result.success;
    };

    const deleteDownload = async (videoId) => {
        // Stop playback if this song is playing
        const currentVideoId = currentSong?.videoId || currentSong?.key;
        if (currentVideoId === videoId) {
            setAudioUrl(null);
            setIsPlaying(false);
        }

        const result = await downloadService.deleteDownloadedSong(videoId, downloads);
        if (result.success) {
            setDownloads(prev => prev.filter(d => d.videoId !== videoId));
        }
    };

    const isDownloaded = (videoId) => {
        return downloadService.isDownloaded(videoId, downloads);
    };

    // ========== LOCAL LIBRARY FUNCTIONS ==========

    const scanDefaultMusicFolder = async () => {
        if (!window.electronAPI) return null;

        setIsScanning(true);
        setScanProgress('Scanning default Music folder...');

        try {
            const { result, newSongs } = await libraryService.scanDefaultMusicFolder(localLibrary);
            if (newSongs.length > 0) {
                setLocalLibrary(prev => [...prev, ...newSongs]);
            }
            return result;
        } catch (error) {
            console.error('[PlayerContext] Failed to scan default folder:', error);
            throw error;
        } finally {
            setIsScanning(false);
            setScanProgress(null);
        }
    };

    const importMusicFolder = async () => {
        if (!window.electronAPI) return null;

        try {
            setIsScanning(true);
            setScanProgress('Selecting folder...');

            const result = await libraryService.importMusicFolder(localLibrary, importedFolders);
            if (!result) {
                return null;
            }

            setScanProgress(`Importing ${result.folderPaths?.length || 1} folder(s)...`);

            if (result.newSongs.length > 0) {
                setLocalLibrary(prev => [...prev, ...result.newSongs]);
            }
            if (result.updatedFolders) {
                setImportedFolders(result.updatedFolders);
            }

            return result.result;
        } catch (error) {
            console.error('[PlayerContext] Failed to import folders:', error);
            throw error;
        } finally {
            setIsScanning(false);
            setScanProgress(null);
        }
    };

    const rescanLibrary = async () => {
        if (!window.electronAPI) return;

        setIsScanning(true);
        setScanProgress('Rescanning library...');

        try {
            const uniqueSongs = await libraryService.rescanLibrary(importedFolders);
            setLocalLibrary(uniqueSongs);
        } catch (error) {
            console.error('[PlayerContext] Rescan failed:', error);
        } finally {
            setIsScanning(false);
            setScanProgress(null);
        }
    };

    const removeLocalSong = async (songId) => {
        try {
            await deleteLocalSong(songId);
            setLocalLibrary(prev => prev.filter(s => s.id !== songId));
        } catch (error) {
            console.error('[PlayerContext] Failed to remove local song:', error);
        }
    };

    return (
        <PlayerContext.Provider
            value={{
                currentSong,
                isPlaying,
                queue,
                currentIndex,
                audioUrl,
                isLoadingAudio,
                downloads,
                playSong,
                togglePlay,
                setIsPlaying,
                playNext,
                playPrevious,
                playQueueTrack,
                setQueue,
                addToQueue: (songs) => setQueue(prev => [...prev, ...songs]),
                downloadSong,
                deleteDownload,
                isDownloaded,
                // Local library
                localLibrary,
                importedFolders,
                isScanning,
                scanProgress,
                scanDefaultMusicFolder,
                importMusicFolder,
                rescanLibrary,
                removeLocalSong,
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    return useContext(PlayerContext);
}
