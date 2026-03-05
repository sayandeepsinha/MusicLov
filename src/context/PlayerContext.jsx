import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { deleteLocalSong } from '../common/db';
import * as mediaService from '../common/mediaService';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [downloads, setDownloads] = useState([]);

    // Playback mode: 'engine' (YouTube via hidden window) or 'local' (HTML5 <audio>)
    const [playbackMode, setPlaybackMode] = useState(null);
    // Audio URL only used for local file playback
    const [audioUrl, setAudioUrl] = useState(null);

    // Engine state (received from hidden BrowserWindow polling)
    const [engineProgress, setEngineProgress] = useState(0);
    const [engineDuration, setEngineDuration] = useState(0);

    const [localLibrary, setLocalLibrary] = useState([]);
    const [importedFolders, setImportedFolders] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(null);

    const scanInitiatedRef = useRef(false);

    // Use refs for values that engine event handlers need to access without stale closures
    const queueRef = useRef([]);
    const currentIndexRef = useRef(-1);
    const downloadsRef = useRef([]);

    // Keep refs in sync with state
    useEffect(() => { queueRef.current = queue; }, [queue]);
    useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
    useEffect(() => { downloadsRef.current = downloads; }, [downloads]);

    // Load downloads and library data on mount
    useEffect(() => {
        mediaService.getAllDownloads().then(setDownloads).catch(console.error);
        mediaService.loadLibraryData().then(({ localLibrary: lib, importedFolders: folders }) => {
            setLocalLibrary(lib);
            setImportedFolders(folders);
        }).catch(console.error);
    }, []);

    // Auto-scan on mount
    useEffect(() => {
        if (scanInitiatedRef.current || !window.electronAPI) return;
        scanInitiatedRef.current = true;
        scanDefaultMusicFolder().catch(() => { scanInitiatedRef.current = false; });
    }, []);

    /**
     * Core playback function — determines engine vs local mode
     */
    const startPlayback = useCallback(async (song) => {
        setIsLoadingAudio(true);
        setAudioUrl(null);
        setEngineProgress(0);
        setEngineDuration(0);

        // Try local file first
        if (song.isLocal && song.filePath) {
            const localUrl = await window.electronAPI?.getLocalFileUrl(song.filePath);
            if (localUrl) {
                // STOP ENGINE FIRST
                if (window.electronAPI?.engineStop) await window.electronAPI.engineStop();

                setPlaybackMode('local');
                setAudioUrl(localUrl);
                setIsLoadingAudio(false);
                setIsPlaying(true);
                return;
            }
        }

        // Try downloaded version
        const videoId = song.videoId || song.id;
        if (videoId) {
            const downloaded = downloadsRef.current.find(d => d.videoId === videoId);
            if (downloaded?.filePath) {
                const localUrl = await window.electronAPI?.getLocalFileUrl(downloaded.filePath);
                if (localUrl) {
                    // STOP ENGINE FIRST
                    if (window.electronAPI?.engineStop) await window.electronAPI.engineStop();

                    setPlaybackMode('local');
                    setAudioUrl(localUrl);
                    setIsLoadingAudio(false);
                    setIsPlaying(true);
                    return;
                }
            }
        }

        // YouTube song — use the engine
        if (videoId && window.electronAPI?.enginePlay) {
            setPlaybackMode('engine');
            setAudioUrl(null);
            await window.electronAPI.enginePlay(videoId);
            // engine:ready event will set isLoadingAudio = false and isPlaying = true
        } else {
            setIsLoadingAudio(false);
        }
    }, []);

    // Use a ref for startPlayback so event handlers always have the latest version
    const startPlaybackRef = useRef(startPlayback);
    useEffect(() => { startPlaybackRef.current = startPlayback; }, [startPlayback]);

    // Subscribe to engine events from the hidden BrowserWindow
    useEffect(() => {
        if (!window.electronAPI?.onEngineEvent) return;

        const cleanup = window.electronAPI.onEngineEvent((channel, data) => {
            switch (channel) {
                case 'engine:loading':
                    setIsLoadingAudio(true);
                    break;

                case 'engine:ready':
                    setIsLoadingAudio(false);
                    setEngineDuration(data.duration || 0);
                    setIsPlaying(true);
                    break;

                case 'engine:timeupdate':
                    setEngineProgress(data.currentTime || 0);
                    if (data.duration && data.duration > 0) {
                        setEngineDuration(data.duration);
                    }
                    // Sync playing state from engine (if engine says paused, respect it)
                    if (data.paused !== undefined) {
                        setIsPlaying(!data.paused);
                    }
                    break;

                case 'engine:ended': {
                    // Use refs to avoid stale closures
                    const idx = currentIndexRef.current;
                    const q = queueRef.current;
                    if (idx < q.length - 1) {
                        const nextIndex = idx + 1;
                        const nextSong = q[nextIndex];
                        setCurrentIndex(nextIndex);
                        setCurrentSong(nextSong);
                        startPlaybackRef.current(nextSong);
                    } else {
                        setIsPlaying(false);
                    }
                    break;
                }

                case 'engine:error':
                    console.error('[PlayerContext] Engine error:', data.error);
                    setIsLoadingAudio(false);
                    break;
            }
        });

        return cleanup;
    }, []);

    const playSong = async (song, relatedSongs = []) => {
        let newQueue = [song];
        let newIndex = 0;

        if (relatedSongs.length > 0) {
            const index = relatedSongs.findIndex(s => {
                if (song.filePath && s.filePath) return s.filePath === song.filePath;
                if (song.videoId && s.videoId) return s.videoId === song.videoId;
                if (song.id && s.id) return s.id === song.id;
                return false;
            });

            if (index !== -1) {
                newQueue = [...relatedSongs];
                newIndex = index;
            } else {
                newQueue = [song, ...relatedSongs];
                newIndex = 0;
            }
        }

        setQueue(newQueue);
        setCurrentIndex(newIndex);
        setCurrentSong(song);
        await startPlayback(song);
    };

    const playNext = () => {
        if (currentIndex < queue.length - 1) {
            playQueueTrack(currentIndex + 1);
        }
    };

    const playPrevious = () => {
        if (currentIndex > 0) {
            playQueueTrack(currentIndex - 1);
        }
    };

    const togglePlay = async () => {
        if (playbackMode === 'engine' && window.electronAPI) {
            if (isPlaying) {
                await window.electronAPI.enginePause();
            } else {
                await window.electronAPI.engineResume();
            }
        }
        setIsPlaying(!isPlaying);
    };

    const playQueueTrack = async (index) => {
        if (index < 0 || index >= queue.length) return;
        setCurrentIndex(index);
        setCurrentSong(queue[index]);
        await startPlayback(queue[index]);
    };

    // Engine-specific controls
    const engineSeek = async (timeSeconds) => {
        if (playbackMode === 'engine' && window.electronAPI?.engineSeek) {
            setEngineProgress(timeSeconds);
            await window.electronAPI.engineSeek(timeSeconds);
        }
    };

    const engineSetVolume = async (volume) => {
        if (playbackMode === 'engine' && window.electronAPI?.engineSetVolume) {
            await window.electronAPI.engineSetVolume(volume);
        }
    };

    const engineSetMuted = async (muted) => {
        if (playbackMode === 'engine' && window.electronAPI?.engineSetMuted) {
            await window.electronAPI.engineSetMuted(muted);
        }
    };

    // Download functions
    const downloadSong = async (song) => {
        const result = await mediaService.downloadSong(song, downloads);
        if (result.success && result.downloadedSong) setDownloads(prev => [...prev, result.downloadedSong]);
        return result.success;
    };

    const deleteDownload = async (videoId) => {
        if ((currentSong?.videoId || currentSong?.key) === videoId) {
            setAudioUrl(null);
            setIsPlaying(false);
            if (playbackMode === 'engine') {
                await window.electronAPI?.engineStop();
            }
        }
        if ((await mediaService.deleteDownloadedSong(videoId, downloads)).success) {
            setDownloads(prev => prev.filter(d => d.videoId !== videoId));
        }
    };

    const isDownloaded = (videoId) => mediaService.isDownloaded(videoId, downloads);

    // Library functions
    const scanDefaultMusicFolder = async () => {
        if (!window.electronAPI) return;
        setIsScanning(true);
        setScanProgress('Scanning default Music folder...');
        try {
            const { result, newSongs } = await mediaService.scanDefaultMusicFolder();
            if (newSongs.length) {
                const freshLibrary = await mediaService.loadLibraryData();
                setLocalLibrary(freshLibrary.localLibrary);
            }
            return result;
        } catch (e) { console.error(e); }
        finally { setIsScanning(false); setScanProgress(null); }
    };

    const importMusicFolder = async () => {
        if (!window.electronAPI) return;
        setIsScanning(true);
        setScanProgress('Selecting folder...');
        try {
            const result = await mediaService.importMusicFolder(importedFolders);
            if (!result) return;
            if (result.newSongs.length) {
                const freshLibrary = await mediaService.loadLibraryData();
                setLocalLibrary(freshLibrary.localLibrary);
            }
            if (result.updatedFolders) setImportedFolders(result.updatedFolders);
        } catch (e) { console.error(e); }
        finally { setIsScanning(false); setScanProgress(null); }
    };

    const rescanLibrary = async () => {
        if (!window.electronAPI) return;
        setIsScanning(true);
        setScanProgress('Rescanning library...');
        try {
            setLocalLibrary(await mediaService.rescanLibrary(importedFolders));
        } catch (e) { console.error(e); }
        finally { setIsScanning(false); setScanProgress(null); }
    };

    const removeLocalSong = async (songId) => {
        deleteLocalSong(songId).then(() => setLocalLibrary(prev => prev.filter(s => s.id !== songId))).catch(console.error);
    };

    return (
        <PlayerContext.Provider value={{
            currentSong, isPlaying, queue, currentIndex, audioUrl, isLoadingAudio, downloads,
            playbackMode, engineProgress, engineDuration,
            playSong, togglePlay, setIsPlaying, playNext, playPrevious, playQueueTrack, setQueue,
            addToQueue: (songs) => setQueue(prev => [...prev, ...songs]),
            engineSeek, engineSetVolume, engineSetMuted,
            downloadSong, deleteDownload, isDownloaded,
            localLibrary, importedFolders, isScanning, scanProgress,
            scanDefaultMusicFolder, importMusicFolder, rescanLibrary, removeLocalSong,
        }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    return useContext(PlayerContext);
}
