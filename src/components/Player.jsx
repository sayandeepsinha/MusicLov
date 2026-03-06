import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { AnimatePresence } from 'framer-motion';
import { MaximizedPlayer, MinimizedPlayer } from './PlayerUI';
import { upgradeThumbnailUrl } from '../common/thumbnailProvider';
import logger from '../common/logger';

export default function Player() {
    const {
        currentSong, isPlaying, setIsPlaying, togglePlay, playNext, playPrevious,
        audioUrl, isLoadingAudio, queue, currentIndex, playQueueTrack,
        playbackMode, engineProgress, engineDuration,
        engineSeek, engineSetVolume, engineSetMuted,
    } = usePlayer();

    const audioRef = useRef(null);
    const [localProgress, setLocalProgress] = useState(0);
    const [localDuration, setLocalDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const isProgrammaticRef = useRef(false);

    // Refs so media session handlers always have fresh values without re-registering
    const progressRef = useRef(0);
    const durationRef = useRef(0);
    const playbackModeRef = useRef(playbackMode);

    // Derived: which progress/duration to show
    const progress = playbackMode === 'engine' ? engineProgress : localProgress;
    const duration = playbackMode === 'engine' ? engineDuration : localDuration;

    // Keep refs in sync
    useEffect(() => { progressRef.current = progress; }, [progress]);
    useEffect(() => { durationRef.current = duration; }, [duration]);
    useEffect(() => { playbackModeRef.current = playbackMode; }, [playbackMode]);

    // === LOCAL AUDIO ELEMENT EFFECTS (only active for local files) ===

    // Load local audio when audioUrl changes
    useEffect(() => {
        if (!audioRef.current) return;

        // If we are NOT in local mode, ENSURE the audio element is stopped and cleared
        if (playbackMode !== 'local') {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current.load();
            return;
        }

        isProgrammaticRef.current = true;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setLocalProgress(0);
        setLocalDuration(0);

        if (audioUrl) {
            audioRef.current.src = audioUrl;
            audioRef.current.load();
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => logger.error('Player', 'Local audio play failed', e));
        }
        setTimeout(() => { isProgrammaticRef.current = false; }, 200);
    }, [audioUrl, setIsPlaying, playbackMode]);

    // Sync play/pause for local mode
    useEffect(() => {
        if (!audioRef.current || !audioUrl || playbackMode === 'engine') return;
        isProgrammaticRef.current = true;
        isPlaying ? audioRef.current.play().catch(() => { }) : audioRef.current.pause();
        setTimeout(() => { isProgrammaticRef.current = false; }, 100);
    }, [isPlaying, audioUrl, playbackMode]);

    // === MEDIA SESSION (works for both modes) ===

    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        const handlers = {
            play: () => togglePlay(),
            pause: () => togglePlay(),
            previoustrack: playPrevious,
            nexttrack: playNext,
            seekbackward: () => {
                // Use refs to always get latest values — avoids stale closure
                const newTime = Math.max(0, progressRef.current - 10);
                if (playbackModeRef.current === 'engine') {
                    engineSeek(newTime);
                } else if (audioRef.current) {
                    audioRef.current.currentTime = newTime;
                    setLocalProgress(newTime);
                }
            },
            seekforward: () => {
                const newTime = Math.min(durationRef.current, progressRef.current + 10);
                if (playbackModeRef.current === 'engine') {
                    engineSeek(newTime);
                } else if (audioRef.current) {
                    audioRef.current.currentTime = newTime;
                    setLocalProgress(newTime);
                }
            },
        };

        Object.entries(handlers).forEach(([action, handler]) =>
            navigator.mediaSession.setActionHandler(action, handler)
        );
        return () => Object.keys(handlers).forEach(action =>
            navigator.mediaSession.setActionHandler(action, null)
        );
        // Only re-register when stable references change (not progress/duration — handled by refs)
    }, [playNext, playPrevious, togglePlay, engineSeek]);

    // Update MediaSession metadata
    useEffect(() => {
        if (!('mediaSession' in navigator) || !currentSong) return;
        const thumb = currentSong.thumbnail?.url || currentSong.thumbnail?.thumbnails?.[0]?.url;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.title || 'Unknown',
            artist: currentSong.artist || currentSong.authors?.map(a => a.name).join(', ') || 'Unknown',
            album: currentSong.album || 'MusicLov',
            artwork: thumb ? [{ src: thumb, sizes: '512x512', type: 'image/jpeg' }] : []
        });
    }, [currentSong]);

    // Update MediaSession playback state
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }, [isPlaying]);

    // === EVENT HANDLERS ===

    const handleTimeUpdate = () => {
        if (!isSeeking && audioRef.current && playbackMode === 'local') {
            setLocalProgress(audioRef.current.currentTime);
            setLocalDuration(audioRef.current.duration || 0);
        }
    };

    const handleSeek = (e) => {
        const t = parseFloat(e.target.value);
        if (playbackMode === 'engine') {
            engineSeek(t);
        } else if (audioRef.current) {
            setLocalProgress(t);
            audioRef.current.currentTime = t;
        }
    };

    const handleEnded = () => {
        // Only for local playback — engine fires its own ended event
        if (playbackMode === 'local') {
            if (isRepeat && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => { });
            } else {
                playNext();
            }
        }
    };

    const toggleMute = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        if (playbackMode === 'engine') {
            engineSetMuted(newMuted);
        } else if (audioRef.current) {
            audioRef.current.muted = newMuted;
        }
    };

    if (!currentSong) return null;

    const thumbnailUrl = currentSong.thumbnail?.url
        ? upgradeThumbnailUrl(currentSong.thumbnail.url)
        : upgradeThumbnailUrl(currentSong.thumbnail?.thumbnails?.[0]?.url);

    const commonProps = {
        song: currentSong, thumbnailUrl, isPlaying, isLoadingAudio, progress, duration,
        isRepeat, isMuted, currentIndex, queueLength: queue.length,
        onTogglePlay: togglePlay, onPrev: playPrevious, onNext: playNext,
        onRepeat: () => setIsRepeat(!isRepeat), onMute: toggleMute,
        onSeekStart: () => setIsSeeking(true), onSeekEnd: () => setIsSeeking(false), onSeek: handleSeek,
    };

    return (
        <>
            {/* Audio element — only used for local file playback */}
            <audio
                ref={audioRef}
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => setLocalDuration(e.target.duration)}
                onEnded={handleEnded}
                onPlay={() => !isProgrammaticRef.current && playbackMode === 'local' && setIsPlaying(true)}
                onPause={() => !isProgrammaticRef.current && playbackMode === 'local' && setIsPlaying(false)}
                className="hidden"
            />
            <AnimatePresence mode="wait">
                {isMaximized ? (
                    <MaximizedPlayer
                        {...commonProps}
                        queue={queue}
                        onMinimize={() => setIsMaximized(false)}
                        onPlayQueueTrack={playQueueTrack}
                    />
                ) : (
                    <MinimizedPlayer
                        {...commonProps}
                        onMaximize={() => setIsMaximized(true)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
