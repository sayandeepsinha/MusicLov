import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { deleteLocalSong } from '../common/db';
import * as mediaService from '../services/mediaService';

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [audioUrl, setAudioUrl] = useState(null);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [downloads, setDownloads] = useState([]);

    const [localLibrary, setLocalLibrary] = useState([]);
    const [importedFolders, setImportedFolders] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(null);

    const scanInitiatedRef = useRef(false);

    useEffect(() => {
        mediaService.getAllDownloads().then(setDownloads).catch(console.error);
        mediaService.loadLibraryData().then(({ localLibrary: lib, importedFolders: folders }) => {
            setLocalLibrary(lib);
            setImportedFolders(folders);
        }).catch(console.error);
    }, []);

    useEffect(() => {
        if (scanInitiatedRef.current || !window.electronAPI) return;
        scanInitiatedRef.current = true;
        scanDefaultMusicFolder().catch(() => { scanInitiatedRef.current = false; });
    }, []);

    const playSong = async (song, relatedSongs = []) => {
        setAudioUrl(null);
        let newQueue = [song];
        let newIndex = 0;

        if (relatedSongs.length > 0) {
            // Find song index using multiple matching strategies
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
        setIsPlaying(true);
        await fetchAudioUrl(song);
    };

    const fetchAudioUrl = async (song) => {
        setIsLoadingAudio(true);
        try {
            const url = await mediaService.fetchAudioUrl(song, downloads);
            setAudioUrl(url);
        } finally { setIsLoadingAudio(false); }
    };

    const playNext = () => currentIndex < queue.length - 1 && playQueueTrack(currentIndex + 1);
    const playPrevious = () => currentIndex > 0 && playQueueTrack(currentIndex - 1);
    const togglePlay = () => setIsPlaying(!isPlaying);

    const playQueueTrack = async (index) => {
        if (index < 0 || index >= queue.length) return;
        setAudioUrl(null);
        setCurrentIndex(index);
        setCurrentSong(queue[index]);
        setIsPlaying(true);
        await fetchAudioUrl(queue[index]);
    };

    const downloadSong = async (song) => {
        const result = await mediaService.downloadSong(song, downloads);
        if (result.success && result.downloadedSong) setDownloads(prev => [...prev, result.downloadedSong]);
        return result.success;
    };

    const deleteDownload = async (videoId) => {
        if ((currentSong?.videoId || currentSong?.key) === videoId) {
            setAudioUrl(null);
            setIsPlaying(false);
        }
        if ((await mediaService.deleteDownloadedSong(videoId, downloads)).success) {
            setDownloads(prev => prev.filter(d => d.videoId !== videoId));
        }
    };

    const isDownloaded = (videoId) => mediaService.isDownloaded(videoId, downloads);

    const scanDefaultMusicFolder = async () => {
        if (!window.electronAPI) return;
        setIsScanning(true);
        setScanProgress('Scanning default Music folder...');
        try {
            const { result, newSongs } = await mediaService.scanDefaultMusicFolder(localLibrary);
            if (newSongs.length) setLocalLibrary(prev => [...prev, ...newSongs]);
            return result;
        } catch (e) { console.error(e); }
        finally { setIsScanning(false); setScanProgress(null); }
    };

    const importMusicFolder = async () => {
        if (!window.electronAPI) return;
        setIsScanning(true);
        setScanProgress('Selecting folder...');
        try {
            const result = await mediaService.importMusicFolder(localLibrary, importedFolders);
            if (!result) return;

            if (result.newSongs.length) setLocalLibrary(prev => [...prev, ...result.newSongs]);
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
            playSong, togglePlay, setIsPlaying, playNext, playPrevious, playQueueTrack, setQueue,
            addToQueue: (songs) => setQueue(prev => [...prev, ...songs]),
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
