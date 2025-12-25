import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music, Repeat, Maximize2, Minimize2, Loader2, Download, Check, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Player() {
    const {
        currentSong,
        isPlaying,
        setIsPlaying,
        togglePlay,
        playNext,
        playPrevious,
        audioUrl,
        isLoadingAudio,
        queue,
        currentIndex,
        playQueueTrack,
        downloadSong,
        isDownloaded,
    } = usePlayer();

    const audioRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    // Track if we're programmatically controlling playback (to avoid feedback loops)
    const isProgrammaticRef = useRef(false);

    // When audio URL changes, stop old audio and load new
    useEffect(() => {
        if (audioRef.current) {
            // Mark as programmatic to prevent onPause/onPlay handlers from interfering
            isProgrammaticRef.current = true;

            // Stop and reset current audio first
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setProgress(0);
            setDuration(0);

            if (audioUrl) {
                audioRef.current.src = audioUrl;
                audioRef.current.load();
                audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(e => console.error('[Player] Play failed:', e));
            }

            // Reset flag after a short delay
            setTimeout(() => { isProgrammaticRef.current = false; }, 200);
        }
    }, [audioUrl, setIsPlaying]);

    // Sync play/pause state
    useEffect(() => {
        if (!audioRef.current || !audioUrl) return;
        isProgrammaticRef.current = true;
        if (isPlaying) {
            audioRef.current.play().catch(() => { });
        } else {
            audioRef.current.pause();
        }
        // Reset flag after a short delay to allow the event to fire
        setTimeout(() => { isProgrammaticRef.current = false; }, 100);
    }, [isPlaying, audioUrl]);

    // Setup MediaSession API for keyboard media keys (next, previous, play, pause)
    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        // Set action handlers for media keys
        navigator.mediaSession.setActionHandler('play', () => {
            if (audioRef.current && audioUrl) {
                audioRef.current.play().catch(() => { });
                setIsPlaying(true);
            }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
            if (audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
            playPrevious();
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
            playNext();
        });

        // Optional: Seek backward/forward (for keyboards with these keys)
        navigator.mediaSession.setActionHandler('seekbackward', () => {
            if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
            }
        });

        navigator.mediaSession.setActionHandler('seekforward', () => {
            if (audioRef.current) {
                audioRef.current.currentTime = Math.min(
                    audioRef.current.duration || 0,
                    audioRef.current.currentTime + 10
                );
            }
        });

        // Cleanup on unmount
        return () => {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
                navigator.mediaSession.setActionHandler('previoustrack', null);
                navigator.mediaSession.setActionHandler('nexttrack', null);
                navigator.mediaSession.setActionHandler('seekbackward', null);
                navigator.mediaSession.setActionHandler('seekforward', null);
            }
        };
    }, [audioUrl, playNext, playPrevious, setIsPlaying]);

    // Update MediaSession metadata when song changes (shows in OS media controls)
    useEffect(() => {
        if (!('mediaSession' in navigator) || !currentSong) return;

        const thumbnailUrl = currentSong.thumbnail?.url || currentSong.thumbnail?.thumbnails?.[0]?.url;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentSong.title || 'Unknown Title',
            artist: currentSong.artist || currentSong.authors?.map(a => a.name).join(', ') || 'Unknown Artist',
            album: currentSong.album || 'MusicLov',
            artwork: thumbnailUrl ? [
                { src: thumbnailUrl, sizes: '96x96', type: 'image/jpeg' },
                { src: thumbnailUrl, sizes: '128x128', type: 'image/jpeg' },
                { src: thumbnailUrl, sizes: '256x256', type: 'image/jpeg' },
                { src: thumbnailUrl, sizes: '512x512', type: 'image/jpeg' },
            ] : []
        });
    }, [currentSong]);

    const handleTimeUpdate = () => {
        // Don't update progress while user is seeking
        if (audioRef.current && !isSeeking) {
            setProgress(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
        }
    };

    const handleSeekStart = () => {
        setIsSeeking(true);
    };

    const handleSeekEnd = () => {
        setIsSeeking(false);
    };

    const handleSeek = (e) => {
        const newTime = parseFloat(e.target.value);
        setProgress(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            console.log('[Player] Seeking to:', newTime);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleEnded = () => {
        if (isRepeat && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => { });
        } else {
            playNext();
        }
    };

    const handleDownload = async () => {
        if (!currentSong || isDownloading) return;
        setIsDownloading(true);
        await downloadSong(currentSong);
        setIsDownloading(false);
    };

    const formatTime = (time) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!currentSong) return null;

    const thumbnailUrl = currentSong.thumbnail?.url || currentSong.thumbnail?.thumbnails?.[0]?.url;
    const songIsDownloaded = currentSong.videoId && isDownloaded(currentSong.videoId);

    return (
        <>
            <audio
                ref={audioRef}
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                onEnded={handleEnded}
                onPlay={() => {
                    // Only sync if this was triggered externally (media keys)
                    if (!isProgrammaticRef.current) setIsPlaying(true);
                }}
                onPause={() => {
                    // Only sync if this was triggered externally (media keys)
                    if (!isProgrammaticRef.current) setIsPlaying(false);
                }}
                className="hidden"
            />

            <AnimatePresence mode="wait">
                {isMaximized ? (
                    // Maximized Player - Clean design with queue
                    <motion.div
                        key="maximized"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-neutral-950 pt-8"
                    >
                        <div className="w-full h-full flex">
                            {/* Left side - Player */}
                            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                                {/* Minimize button - top left */}
                                <button
                                    onClick={() => setIsMaximized(false)}
                                    className="absolute top-4 left-4 text-white/50 hover:text-white transition-colors"
                                >
                                    <Minimize2 className="w-5 h-5" />
                                </button>

                                {/* Album Art */}
                                <div className="w-64 h-64 mb-8">
                                    {thumbnailUrl ? (
                                        <img src={thumbnailUrl} alt="" className="w-full h-full rounded-lg shadow-2xl object-cover" />
                                    ) : (
                                        <div className="w-full h-full rounded-lg bg-neutral-800 flex items-center justify-center">
                                            <Music className="w-20 h-20 text-neutral-600" />
                                        </div>
                                    )}
                                </div>

                                {/* Song Info */}
                                <h2 className="text-xl font-semibold text-white text-center mb-1 max-w-md line-clamp-2">{currentSong.title}</h2>
                                <p className="text-neutral-400 text-sm mb-8">{currentSong.artist || currentSong.authors?.map(a => a.name).join(', ')}</p>

                                {/* Progress Bar */}
                                <div className="w-full max-w-md flex items-center gap-3 text-xs text-neutral-400 mb-6">
                                    <span className="w-10 text-right">{formatTime(progress)}</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration || 100}
                                        step="0.1"
                                        value={progress}
                                        onMouseDown={handleSeekStart}
                                        onTouchStart={handleSeekStart}
                                        onMouseUp={handleSeekEnd}
                                        onTouchEnd={handleSeekEnd}
                                        onChange={handleSeek}
                                        className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                    <span className="w-10">{formatTime(duration)}</span>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-6">
                                    <button onClick={() => setIsRepeat(!isRepeat)} className={isRepeat ? 'text-purple-400' : 'text-neutral-500 hover:text-white'}>
                                        <Repeat className="w-5 h-5" />
                                    </button>
                                    <button onClick={playPrevious} disabled={currentIndex <= 0} className="text-white hover:text-neutral-300 disabled:opacity-30">
                                        <SkipBack className="w-7 h-7" />
                                    </button>
                                    <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all">
                                        {isLoadingAudio ? <Loader2 className="w-6 h-6 animate-spin" /> : isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                                    </button>
                                    <button onClick={playNext} disabled={currentIndex >= queue.length - 1} className="text-white hover:text-neutral-300 disabled:opacity-30">
                                        <SkipForward className="w-7 h-7" />
                                    </button>
                                    <button onClick={handleDownload} disabled={isDownloading || songIsDownloaded} className={songIsDownloaded ? 'text-green-400' : 'text-neutral-500 hover:text-white disabled:opacity-50'}>
                                        {songIsDownloaded ? <Check className="w-5 h-5" /> : isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                    </button>
                                    <button onClick={toggleMute} className="text-neutral-500 hover:text-white">
                                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Right side - Queue */}
                            <div className="w-[400px] border-l border-white/5 flex flex-col">
                                {/* Queue Header */}
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold text-white">Queue ({queue.length})</h3>
                                </div>

                                {/* Queue List */}
                                <div className="flex-1 overflow-y-auto px-4 pb-4">
                                    <div className="space-y-1">
                                        {queue.map((song, index) => (
                                            <div
                                                key={song.videoId || index}
                                                onClick={() => playQueueTrack(index)}
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${index === currentIndex ? 'bg-purple-600/30' : 'hover:bg-white/5'}`}
                                            >
                                                <span className="text-sm text-neutral-500 w-6 text-center">{index + 1}</span>
                                                {song.thumbnail?.url ? (
                                                    <img src={song.thumbnail.url} alt="" className="w-10 h-10 rounded object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded bg-neutral-800 flex items-center justify-center">
                                                        <Music className="w-4 h-4 text-neutral-600" />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-sm truncate ${index === currentIndex ? 'text-purple-400' : 'text-white'}`}>{song.title}</p>
                                                    <p className="text-xs text-neutral-500 truncate">{song.artist}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    // Minimized Player Bar
                    <motion.div
                        key="minimized"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed z-50 left-4 right-4 bottom-4 max-w-5xl mx-auto"
                    >
                        <div className="w-full rounded-2xl p-4 bg-neutral-900/95 border border-white/10 shadow-xl backdrop-blur-xl flex flex-col gap-3">
                            {/* Progress Bar */}
                            <div className="flex items-center gap-2 text-xs text-neutral-400">
                                <span className="w-10 text-right">{formatTime(progress)}</span>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 100}
                                    step="0.1"
                                    value={progress}
                                    onMouseDown={handleSeekStart}
                                    onTouchStart={handleSeekStart}
                                    onMouseUp={handleSeekEnd}
                                    onTouchEnd={handleSeekEnd}
                                    onChange={handleSeek}
                                    className="flex-1 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                                <span className="w-10">{formatTime(duration)}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                {/* Song Info */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {thumbnailUrl ? (
                                        <img src={thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center">
                                            <Music className="w-6 h-6 text-neutral-600" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-white truncate text-sm">{currentSong.title}</h3>
                                        <p className="text-xs text-neutral-400 truncate">{currentSong.artist || currentSong.authors?.map(a => a.name).join(', ')}</p>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-4 flex-1 justify-center">
                                    <button onClick={playPrevious} disabled={currentIndex <= 0} className="text-neutral-400 hover:text-white disabled:opacity-30">
                                        <SkipBack className="w-5 h-5" />
                                    </button>
                                    <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all">
                                        {isLoadingAudio ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                                    </button>
                                    <button onClick={playNext} disabled={currentIndex >= queue.length - 1} className="text-neutral-400 hover:text-white disabled:opacity-30">
                                        <SkipForward className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Extra Controls */}
                                <div className="flex items-center gap-3 flex-1 justify-end">
                                    <button onClick={() => setIsRepeat(!isRepeat)} className={isRepeat ? 'text-purple-400' : 'text-neutral-400 hover:text-white'}>
                                        <Repeat className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleDownload} disabled={isDownloading || songIsDownloaded} className={songIsDownloaded ? 'text-green-400' : 'text-neutral-400 hover:text-white disabled:opacity-50'}>
                                        {songIsDownloaded ? <Check className="w-4 h-4" /> : isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    </button>
                                    <button onClick={toggleMute} className="text-neutral-400 hover:text-white">
                                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => setIsMaximized(true)} className="text-neutral-400 hover:text-white">
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
