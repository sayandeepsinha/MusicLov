import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { AnimatePresence } from 'framer-motion';
import { MaximizedPlayer, MinimizedPlayer } from './PlayerUI';

export default function Player() {
    const { currentSong, isPlaying, setIsPlaying, togglePlay, playNext, playPrevious, audioUrl, isLoadingAudio, queue, currentIndex, playQueueTrack, downloadSong, isDownloaded } = usePlayer();

    const audioRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const isProgrammaticRef = useRef(false);

    // Audio URL change handler
    useEffect(() => {
        if (!audioRef.current) return;
        isProgrammaticRef.current = true;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setProgress(0);
        setDuration(0);

        if (audioUrl) {
            audioRef.current.src = audioUrl;
            audioRef.current.load();
            audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        }
        setTimeout(() => { isProgrammaticRef.current = false; }, 200);
    }, [audioUrl, setIsPlaying]);

    // Sync play/pause state
    useEffect(() => {
        if (!audioRef.current || !audioUrl) return;
        isProgrammaticRef.current = true;
        isPlaying ? audioRef.current.play().catch(() => { }) : audioRef.current.pause();
        setTimeout(() => { isProgrammaticRef.current = false; }, 100);
    }, [isPlaying, audioUrl]);

    // MediaSession API for OS media keys
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        const handlers = {
            play: () => { audioRef.current?.play().catch(() => { }); setIsPlaying(true); },
            pause: () => { audioRef.current?.pause(); setIsPlaying(false); },
            previoustrack: playPrevious,
            nexttrack: playNext,
            seekbackward: () => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); },
            seekforward: () => { if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 10); },
        };
        Object.entries(handlers).forEach(([action, handler]) => navigator.mediaSession.setActionHandler(action, handler));
        return () => Object.keys(handlers).forEach(action => navigator.mediaSession.setActionHandler(action, null));
    }, [audioUrl, playNext, playPrevious, setIsPlaying]);

    // Update MediaSession metadata
    useEffect(() => {
        if (!('mediaSession' in navigator) || !currentSong) return;
        const thumb = currentSong.thumbnail?.url || currentSong.thumbnail?.thumbnails?.[0]?.url;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.title || 'Unknown', artist: currentSong.artist || currentSong.authors?.map(a => a.name).join(', ') || 'Unknown', album: currentSong.album || 'MusicLov',
            artwork: thumb ? [{ src: thumb, sizes: '512x512', type: 'image/jpeg' }] : []
        });
    }, [currentSong]);

    const handleTimeUpdate = () => !isSeeking && audioRef.current && (setProgress(audioRef.current.currentTime), setDuration(audioRef.current.duration || 0));
    const handleSeek = (e) => { const t = parseFloat(e.target.value); setProgress(t); if (audioRef.current) audioRef.current.currentTime = t; };
    const handleEnded = () => isRepeat && audioRef.current ? (audioRef.current.currentTime = 0, audioRef.current.play().catch(() => { })) : playNext();
    const handleDownload = async () => { if (!currentSong || isDownloading) return; setIsDownloading(true); await downloadSong(currentSong); setIsDownloading(false); };
    const toggleMute = () => { if (audioRef.current) { audioRef.current.muted = !isMuted; setIsMuted(!isMuted); } };

    if (!currentSong) return null;

    const thumbnailUrl = currentSong.thumbnail?.url || currentSong.thumbnail?.thumbnails?.[0]?.url;
    const songIsDownloaded = currentSong.videoId && isDownloaded(currentSong.videoId);

    const commonProps = {
        song: currentSong, thumbnailUrl, isPlaying, isLoadingAudio, progress, duration, isRepeat, isMuted, songIsDownloaded, isDownloading, currentIndex,
        onTogglePlay: togglePlay, onPrev: playPrevious, onNext: playNext, onRepeat: () => setIsRepeat(!isRepeat), onMute: toggleMute, onDownload: handleDownload,
        onSeekStart: () => setIsSeeking(true), onSeekEnd: () => setIsSeeking(false), onSeek: handleSeek,
    };

    return (
        <>
            <audio ref={audioRef} preload="auto" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={(e) => setDuration(e.target.duration)} onEnded={handleEnded}
                onPlay={() => !isProgrammaticRef.current && setIsPlaying(true)} onPause={() => !isProgrammaticRef.current && setIsPlaying(false)} className="hidden" />
            <AnimatePresence mode="wait">
                {isMaximized ? (
                    <MaximizedPlayer {...commonProps} queue={queue} onMinimize={() => setIsMaximized(false)} onPlayQueueTrack={playQueueTrack} />
                ) : (
                    <MinimizedPlayer {...commonProps} queueLength={queue.length} onMaximize={() => setIsMaximized(true)} />
                )}
            </AnimatePresence>
        </>
    );
}
