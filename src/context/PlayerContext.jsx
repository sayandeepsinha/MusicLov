import { createContext, useContext, useState, useEffect } from 'react';

const PlayerContext = createContext();

// IndexedDB helper functions
const DB_NAME = 'musiclov_db';
const DB_VERSION = 1;
const STORE_NAME = 'downloads';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
            }
        };
    });
}

async function getAllDownloads() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function saveDownload(song) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(song);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function removeDownload(videoId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(videoId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

export function PlayerProvider({ children }) {
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [queue, setQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [audioUrl, setAudioUrl] = useState(null);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [downloads, setDownloads] = useState([]);

    // Load downloads from IndexedDB on mount
    useEffect(() => {
        getAllDownloads()
            .then(setDownloads)
            .catch(err => console.error('Failed to load downloads:', err));
    }, []);

    const fetchAudioUrl = async (videoId) => {
        if (!videoId) return null;

        setIsLoadingAudio(true);
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

        setCurrentSong(song);
        setIsPlaying(true);

        // Set queue with current song and related songs
        const newQueue = [song, ...relatedSongs.filter(s => s.videoId !== song.videoId)];
        setQueue(newQueue);
        setCurrentIndex(0);

        const videoId = song.videoId || song.key || song.id;
        if (videoId) {
            await fetchAudioUrl(videoId);
        }
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

            const videoId = nextSong.videoId || nextSong.key;
            if (videoId) {
                await fetchAudioUrl(videoId);
            }
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

            const videoId = prevSong.videoId || prevSong.key;
            if (videoId) {
                await fetchAudioUrl(videoId);
            }
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

            const videoId = song.videoId || song.key;
            if (videoId) {
                await fetchAudioUrl(videoId);
            }
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
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    return useContext(PlayerContext);
}
