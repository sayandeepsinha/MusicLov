/**
 * PlayerContext — Unified player state
 *
 * Architecture contract:
 *  - UI (this file) owns `isPlaying` entirely.
 *  - The engine's `engine:timeupdate` sends progress ONLY — never touches isPlaying.
 *  - isPlaying is set from: togglePlay(), engine:ready, engine:loading, engine:ended.
 *  - On mount, we sync from the engine via engineGetState() to handle HMR reloads.
 */
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { deleteLocalSong } from '../common/db';
import * as mediaService from '../common/mediaService';
import logger from '../common/logger';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [downloads, setDownloads] = useState([]);
    const [playbackMode, setPlaybackMode] = useState(null); // 'engine' | 'local'
    const [audioUrl, setAudioUrl] = useState(null);
    const [engineProgress, setEngineProgress] = useState(0);
    const [engineDuration, setEngineDuration] = useState(0);
    const [localLibrary, setLocalLibrary] = useState([]);
    const [importedFolders, setImportedFolders] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(null);

    // Refs so IPC callbacks (registered once) can always read latest values
    const queueRef = useRef([]);
    const currentIndexRef = useRef(-1);
    const downloadsRef = useRef([]);
    const scanInitiatedRef = useRef(false);

    // Guard: prevent engine:ended from firing twice for the same song
    const endedHandledRef = useRef(false);

    useEffect(() => { queueRef.current = queue; }, [queue]);
    useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
    useEffect(() => { downloadsRef.current = downloads; }, [downloads]);

    // ─── Initialisation ───────────────────────────────────────────────────────

    useEffect(() => {
        mediaService.getAllDownloads().then(setDownloads)
            .catch(e => logger.error('PlayerContext', 'load downloads', e));
        mediaService.loadLibraryData().then(({ localLibrary: lib, importedFolders: f }) => {
            setLocalLibrary(lib);
            setImportedFolders(f);
        }).catch(e => logger.error('PlayerContext', 'load library', e));
    }, []);

    // Auto-scan once on mount
    useEffect(() => {
        if (scanInitiatedRef.current || !window.electronAPI) return;
        scanInitiatedRef.current = true;
        scanDefaultMusicFolder().catch(() => { scanInitiatedRef.current = false; });
    }, []);

    // Sync with engine on mount — handles HMR reloads where engine keeps running
    useEffect(() => {
        if (!window.electronAPI?.engineGetState) return;
        window.electronAPI.engineGetState().then(state => {
            if (!state || !state.videoId) return;
            // Engine is mid-playback but UI just (re)mounted — re-attach
            setEngineProgress(state.currentTime || 0);
            setEngineDuration(state.duration || 0);
            setIsPlaying(state.isPlaying || false);
            setIsLoadingAudio(false);
            setPlaybackMode('engine');
        }).catch(() => { });
    }, []);

    // ─── Core playback ────────────────────────────────────────────────────────

    const startPlayback = useCallback(async (song) => {
        setIsLoadingAudio(true);
        setAudioUrl(null);
        setEngineProgress(0);
        setEngineDuration(0);
        setIsPlaying(false);
        endedHandledRef.current = false;

        // 1. Local file
        if (song.isLocal && song.filePath) {
            const url = await window.electronAPI?.getLocalFileUrl(song.filePath);
            if (url) {
                await window.electronAPI?.engineStop?.();
                setPlaybackMode('local');
                setAudioUrl(url);
                setIsLoadingAudio(false);
                setIsPlaying(true);
                return;
            }
        }

        // 2. Downloaded version
        const videoId = song.videoId || song.id;
        if (videoId) {
            const dl = downloadsRef.current.find(d => d.videoId === videoId);
            if (dl?.filePath) {
                const url = await window.electronAPI?.getLocalFileUrl(dl.filePath);
                if (url) {
                    await window.electronAPI?.engineStop?.();
                    setPlaybackMode('local');
                    setAudioUrl(url);
                    setIsLoadingAudio(false);
                    setIsPlaying(true);
                    return;
                }
            }
        }

        // 3. YouTube engine
        if (videoId && window.electronAPI?.enginePlay) {
            setPlaybackMode('engine');
            await window.electronAPI.enginePlay(videoId);
            // engine:ready will set isLoadingAudio=false and isPlaying=true
        } else {
            setIsLoadingAudio(false);
        }
    }, []);

    const startPlaybackRef = useRef(startPlayback);
    useEffect(() => { startPlaybackRef.current = startPlayback; }, [startPlayback]);

    // ─── Engine event listener ────────────────────────────────────────────────

    useEffect(() => {
        if (!window.electronAPI?.onEngineEvent) return;

        const cleanup = window.electronAPI.onEngineEvent((channel, data) => {
            switch (channel) {
                case 'engine:loading':
                    setIsLoadingAudio(true);
                    setIsPlaying(false);
                    break;

                case 'engine:ready':
                    // Song is loaded and playing natively
                    setIsLoadingAudio(false);
                    setEngineDuration(data.duration || 0);
                    setIsPlaying(true);
                    break;

                case 'engine:timeupdate':
                    // Progress only — never touches isPlaying
                    setEngineProgress(data.currentTime || 0);
                    if (data.duration > 0) setEngineDuration(data.duration);
                    break;

                case 'engine:ended': {
                    if (endedHandledRef.current) break;
                    endedHandledRef.current = true;
                    const idx = currentIndexRef.current;
                    const q = queueRef.current;
                    if (idx < q.length - 1) {
                        const next = q[idx + 1];
                        setCurrentIndex(idx + 1);
                        setCurrentSong(next);
                        startPlaybackRef.current(next);
                    } else {
                        setIsPlaying(false);
                    }
                    break;
                }

                case 'engine:error':
                    logger.error('PlayerContext', 'Engine error', data.error);
                    setIsLoadingAudio(false);
                    setIsPlaying(false);
                    break;
            }
        });

        return cleanup;
    }, []);

    // ─── Player controls ──────────────────────────────────────────────────────

    const playSong = async (song, relatedSongs = []) => {
        let newQueue = [song];
        let newIndex = 0;

        if (relatedSongs.length > 0) {
            const i = relatedSongs.findIndex(s =>
                (song.filePath && s.filePath === song.filePath) ||
                (song.videoId && s.videoId === song.videoId) ||
                (song.id && s.id === song.id)
            );
            if (i !== -1) { newQueue = [...relatedSongs]; newIndex = i; }
            else { newQueue = [song, ...relatedSongs]; }
        }

        setQueue(newQueue);
        setCurrentIndex(newIndex);
        setCurrentSong(song);
        await startPlayback(song);
    };

    /**
     * togglePlay — UI is the source of truth for isPlaying.
     * State flips instantly for any mode. IPC fires in the background.
     */
    const togglePlay = () => {
        setIsPlaying(prev => {
            const nextPlaying = !prev;

            if (playbackMode === 'engine' && window.electronAPI) {
                if (nextPlaying) {
                    window.electronAPI.engineResume();
                } else {
                    window.electronAPI.enginePause();
                }
            }
            return nextPlaying;
        });
    };

    const playNext = () => {
        if (currentIndex < queue.length - 1) playQueueTrack(currentIndex + 1);
    };

    const playPrevious = () => {
        if (currentIndex > 0) playQueueTrack(currentIndex - 1);
    };

    const playQueueTrack = async (index) => {
        if (index < 0 || index >= queue.length) return;
        setCurrentIndex(index);
        setCurrentSong(queue[index]);
        await startPlayback(queue[index]);
    };

    const engineSeek = (timeSeconds) => {
        if (playbackMode === 'engine' && window.electronAPI?.engineSeek) {
            setEngineProgress(timeSeconds); // optimistic UI update
            window.electronAPI.engineSeek(timeSeconds);
        }
    };

    const engineSetVolume = (vol) => window.electronAPI?.engineSetVolume?.(vol);
    const engineSetMuted = (m) => window.electronAPI?.engineSetMuted?.(m);
    const downloadSong = () => logger.warn('PlayerContext', 'downloadSong: not implemented');

    const deleteDownload = async (videoId) => {
        const result = await mediaService.deleteDownloadedSong(videoId, downloads);
        if (result.success) setDownloads(prev => prev.filter(d => d.videoId !== videoId));
    };

    const isDownloaded = (videoId) => mediaService.isDownloaded(videoId, downloads);

    // ─── Library controls ─────────────────────────────────────────────────────

    const scanDefaultMusicFolder = async () => {
        if (!window.electronAPI) return;
        setIsScanning(true); setScanProgress('Scanning Music folder...');
        try {
            const { newSongs } = await mediaService.scanDefaultMusicFolder();
            if (newSongs?.length) {
                const { localLibrary: lib } = await mediaService.loadLibraryData();
                setLocalLibrary(lib);
            }
        } catch (e) { logger.error('PlayerContext', 'scan failed', e); }
        finally { setIsScanning(false); setScanProgress(null); }
    };

    const importMusicFolder = async () => {
        if (!window.electronAPI) return;
        setIsScanning(true); setScanProgress('Selecting folder...');
        try {
            const result = await mediaService.importMusicFolder(importedFolders);
            if (!result) return;
            if (result.newSongs?.length) {
                const { localLibrary: lib } = await mediaService.loadLibraryData();
                setLocalLibrary(lib);
            }
            if (result.updatedFolders) setImportedFolders(result.updatedFolders);
        } catch (e) { logger.error('PlayerContext', 'importFolder failed', e); }
        finally { setIsScanning(false); setScanProgress(null); }
    };

    const rescanLibrary = async () => {
        if (!window.electronAPI) return;
        setIsScanning(true); setScanProgress('Rescanning...');
        try { setLocalLibrary(await mediaService.rescanLibrary(importedFolders)); }
        catch (e) { logger.error('PlayerContext', 'rescan failed', e); }
        finally { setIsScanning(false); setScanProgress(null); }
    };

    const removeLocalSong = (songId) => {
        deleteLocalSong(songId)
            .then(() => setLocalLibrary(p => p.filter(s => s.id !== songId)))
            .catch(e => logger.error('PlayerContext', 'removeLocalSong', e));
    };

    // ─── Context value ────────────────────────────────────────────────────────

    return (
        <PlayerContext.Provider value={{
            currentSong, isPlaying, queue, currentIndex, audioUrl, isLoadingAudio, downloads,
            playbackMode, engineProgress, engineDuration,
            playSong, togglePlay, setIsPlaying, playNext, playPrevious, playQueueTrack,
            setQueue, addToQueue: (songs) => setQueue(p => [...p, ...songs]),
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
