import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
    openDB,
    getAllDownloads,
    saveDownload,
    removeDownload,
    getAllLocalSongs,
    saveLocalSongs,
    clearLocalLibrary,
    getSetting,
    saveSetting,
    deleteLocalSong,
} from '../common/db';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
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

        getAllLocalSongs()
            .then(setLocalLibrary)
            .catch(err => console.error('Failed to load local library:', err));

        getSetting('importedFolders')
            .then(folders => setImportedFolders(folders || []))
            .catch(err => console.error('Failed to load imported folders:', err));
    }, []);

    // Auto-scan default music folder on every app launch
    useEffect(() => {
        const autoScan = async () => {
            // Prevent duplicate scans in React Strict Mode
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
                    scanInitiatedRef.current = false; // Reset on error
                }
            }
        };
        autoScan();
    }, []);

    const fetchAudioUrl = async (song) => {
        if (!song) return null;

        setIsLoadingAudio(true);

        // Handle local files
        if (song.isLocal && song.filePath) {
            console.log('[PlayerContext] Playing local file:', song.filePath);
            try {
                const url = await window.electronAPI.getLocalFileUrl(song.filePath);
                console.log('[PlayerContext] Got local file URL');
                setAudioUrl(url);
                return url;
            } catch (error) {
                console.error('[PlayerContext] Failed to get local file URL:', error);
                return null;
            } finally {
                setIsLoadingAudio(false);
            }
        }

        // Handle online songs
        const videoId = song.videoId || song.key || song.id;
        if (!videoId) return null;

        console.log('[PlayerContext] Fetching audio for:', videoId);

        try {
            // Check if song is downloaded first
            const downloaded = downloads.find(d => d.videoId === videoId);
            if (downloaded && downloaded.audioUrl) {
                console.log('[PlayerContext] Using offline audio');
                setAudioUrl(downloaded.audioUrl);
                return downloaded.audioUrl;
            }

            // Otherwise fetch from internet
            if (window.electronAPI) {
                const url = await window.electronAPI.getAudioUrl(videoId);
                console.log('[PlayerContext] Got audio URL');
                setAudioUrl(url);
                return url;
            } else {
                console.error('[PlayerContext] Electron API not available');
                return null;
            }
        } catch (error) {
            console.error('[PlayerContext] Failed to get audio URL:', error);
            return null;
        } finally {
            setIsLoadingAudio(false);
        }
    };

    const playSong = async (song, relatedSongs = []) => {
        console.log('[PlayerContext] Playing song:', song.title);

        // Stop current audio immediately
        setAudioUrl(null);

        // If relatedSongs (context/queue) is provided and has more than 1 item, use it as the queue
        // Otherwise, fallback to the old behavior (song + related) for single tracks/search results
        let newQueue = [];
        let newIndex = 0;

        if (relatedSongs.length > 0) {
            // Check if we are playing from a list/library
            const index = relatedSongs.findIndex(s =>
                (s.videoId && s.videoId === song.videoId) ||
                (s.id && s.id === song.id)
            );

            if (index !== -1) {
                // We found the song in the provided list, so use the list as-is (preserving order)
                newQueue = [...relatedSongs];
                newIndex = index;
            } else {
                // Song not in list, fallback to putting it first
                newQueue = [song, ...relatedSongs];
                newIndex = 0;
            }
        } else {
            // Single song play
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

            // Stop current audio immediately
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

            // Stop current audio immediately
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

            // Stop current audio immediately
            setAudioUrl(null);

            setCurrentIndex(index);
            setCurrentSong(song);
            setIsPlaying(true);

            await fetchAudioUrl(song);
        }
    };

    // Download a song for offline playback
    const downloadSong = async (song) => {
        const videoId = song.videoId || song.key;
        if (!videoId) return false;

        // Check if already downloaded
        if (downloads.some(d => d.videoId === videoId)) {
            console.log('[PlayerContext] Song already downloaded');
            return true;
        }

        try {
            console.log('[PlayerContext] Downloading song:', song.title);

            // Get audio URL
            const url = await window.electronAPI.getAudioUrl(videoId);
            if (!url) throw new Error('Failed to get audio URL');

            // Save song metadata with audio URL to IndexedDB
            const downloadedSong = {
                videoId,
                title: song.title,
                artist: song.artist,
                thumbnail: song.thumbnail,
                audioUrl: url, // Store the streaming URL
                downloadedAt: Date.now(),
            };

            await saveDownload(downloadedSong);
            setDownloads(prev => [...prev, downloadedSong]);
            console.log('[PlayerContext] Downloaded successfully');
            return true;
        } catch (error) {
            console.error('[PlayerContext] Download failed:', error);
            return false;
        }
    };

    // Delete a downloaded song
    const deleteDownload = async (videoId) => {
        try {
            await removeDownload(videoId);
            setDownloads(prev => prev.filter(d => d.videoId !== videoId));
        } catch (error) {
            console.error('Failed to delete download:', error);
        }
    };

    // Check if a song is downloaded
    const isDownloaded = (videoId) => {
        return downloads.some(d => d.videoId === videoId);
    };

    // ========== LOCAL LIBRARY FUNCTIONS ==========

    // Scan the default music folder
    const scanDefaultMusicFolder = async () => {
        if (!window.electronAPI) return null;

        setIsScanning(true);
        setScanProgress('Scanning default Music folder...');

        try {
            const result = await window.electronAPI.scanDefaultMusicFolder();

            if (result && result.songs.length > 0) {
                // Merge with existing local library (avoid duplicates)
                const existingPaths = new Set(localLibrary.map(s => s.filePath));
                const newSongs = result.songs.filter(s => !existingPaths.has(s.filePath));

                if (newSongs.length > 0) {
                    await saveLocalSongs(newSongs);
                    setLocalLibrary(prev => [...prev, ...newSongs]);
                }

                console.log(`[PlayerContext] Added ${newSongs.length} new local songs`);
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

    // Open folder picker and import selected folders
    const importMusicFolder = async () => {
        if (!window.electronAPI) return null;

        try {
            const folderPaths = await window.electronAPI.selectMusicFolder();
            if (!folderPaths || folderPaths.length === 0) return null;

            setIsScanning(true);
            setScanProgress(`Importing ${folderPaths.length} folder(s)...`);

            const result = await window.electronAPI.importMusicFolders(folderPaths);

            if (result && result.songs.length > 0) {
                // Merge with existing local library (avoid duplicates)
                const existingPaths = new Set(localLibrary.map(s => s.filePath));
                const newSongs = result.songs.filter(s => !existingPaths.has(s.filePath));

                if (newSongs.length > 0) {
                    await saveLocalSongs(newSongs);
                    setLocalLibrary(prev => [...prev, ...newSongs]);
                }

                // Save imported folder paths
                const newFolders = [...new Set([...importedFolders, ...folderPaths])];
                setImportedFolders(newFolders);
                await saveSetting('importedFolders', newFolders);

                console.log(`[PlayerContext] Imported ${newSongs.length} new songs from selected folders`);
            }

            return result;
        } catch (error) {
            console.error('[PlayerContext] Failed to import folders:', error);
            throw error;
        } finally {
            setIsScanning(false);
            setScanProgress(null);
        }
    };

    // Rescan all imported folders
    const rescanLibrary = async () => {
        if (!window.electronAPI) return;

        setIsScanning(true);
        setScanProgress('Rescanning library...');

        try {
            // Clear existing local library
            await clearLocalLibrary();
            setLocalLibrary([]);

            // Scan default folder
            const defaultResult = await window.electronAPI.scanDefaultMusicFolder();
            let allSongs = defaultResult?.songs || [];

            // Scan imported folders
            if (importedFolders.length > 0) {
                const importResult = await window.electronAPI.importMusicFolders(importedFolders);
                if (importResult?.songs) {
                    allSongs = [...allSongs, ...importResult.songs];
                }
            }

            // Remove duplicates by file path
            const uniqueSongs = Array.from(
                new Map(allSongs.map(s => [s.filePath, s])).values()
            );

            await saveLocalSongs(uniqueSongs);
            setLocalLibrary(uniqueSongs);

            console.log(`[PlayerContext] Rescanned library: ${uniqueSongs.length} songs`);
        } catch (error) {
            console.error('[PlayerContext] Rescan failed:', error);
        } finally {
            setIsScanning(false);
            setScanProgress(null);
        }
    };

    // Remove a song from local library
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

