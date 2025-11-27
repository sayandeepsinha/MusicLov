"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { saveSong } from "@/lib/db";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Minimize2, Download, Repeat } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Player() {
    const { currentSong, isPlaying, setIsPlaying, togglePlay, playNext, playPrevious, playQueueTrack, queue, currentIndex } = usePlayer();
    const audioRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (currentSong && audioRef.current) {
            if (currentSong.src) {
                // Offline playback (Blob URL)
                audioRef.current.src = currentSong.src;
                audioRef.current.play().catch(e => console.error("Play failed", e));
                setIsPlaying(true);
            } else {
                // Online playback (Stream API)
                const videoId = currentSong.key || currentSong.videoId;
                if (videoId) {
                    audioRef.current.src = `/api/stream?videoId=${videoId}`;
                    audioRef.current.play().catch(e => console.error("Play failed", e));
                    setIsPlaying(true);
                }
            }
        }
    }, [currentSong, setIsPlaying]);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(() => { });
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
        }
    };

    const handleSeek = (e) => {
        const newTime = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            setProgress(newTime);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleRepeat = () => {
        setIsRepeat(!isRepeat);
    };

    const toggleMaximize = () => {
        setIsMaximized(!isMaximized);
    };

    const handleEnded = () => {
        if (isRepeat && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.error("Replay failed", e));
            setIsPlaying(true);
        } else {
            // Auto-play next song in queue
            playNext();
        }
    };

    const handleDownload = async () => {
        if (!currentSong) return;
        const videoId = currentSong.key || currentSong.videoId;
        const title = currentSong.info?.name || currentSong.title || "audio";

        if (videoId) {
            try {
                // 1. Trigger browser download
                const downloadUrl = `/api/download?videoId=${videoId}&title=${encodeURIComponent(title)}`;
                window.open(downloadUrl, '_blank');

                // 2. Fetch and save to IndexedDB for offline library
                const res = await fetch(downloadUrl);
                const blob = await res.blob();

                await saveSong({
                    videoId,
                    title,
                    artist: currentSong.authors?.map(a => a.name).join(", ") || "Unknown Artist",
                    thumbnail: currentSong.thumbnail?.url,
                    blob,
                    timestamp: Date.now()
                });
                console.log("Song saved to offline library");
            } catch (error) {
                console.error("Failed to save offline:", error);
            }
        }
    };

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    if (!currentSong) return null;

    return (
        <>
            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                className="hidden"
            />

            <AnimatePresence mode="wait">
                {isMaximized ? (
                    <motion.div
                        key="maximized"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed z-50 left-0 right-0 mx-auto max-w-5xl top-4 bottom-4 px-4"
                    >
                        <div className="w-full h-full rounded-2xl bg-neutral-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
                            {/* Background Blur */}
                            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                                <img
                                    src={currentSong.thumbnail?.highRes || currentSong.thumbnail?.url}
                                    alt="blur-bg"
                                    className="w-full h-full object-cover blur-3xl"
                                />
                                <div className="absolute inset-0 bg-black/60" />
                            </div>

                            {/* Main Content Container */}
                            <div className="relative z-10 flex flex-col landscape:flex-row w-full h-full p-4 md:p-6 gap-3 md:gap-6 [@media(max-height:500px)]:gap-2 [@media(max-height:500px)]:p-2">

                                {/* Left Side: Player Controls */}
                                <div className="flex-1 flex flex-col justify-center items-center min-h-0 overflow-y-auto">
                                    {/* Header (Mobile only close button) */}
                                    <div className="w-full flex justify-between md:hidden mb-3 [@media(max-height:500px)]:mb-1">
                                        <button onClick={toggleMaximize} className="text-white/70 hover:text-white">
                                            <Minimize2 className="w-6 h-6" />
                                        </button>
                                    </div>

                                    <div className="w-full max-w-sm md:max-w-2xl flex flex-col gap-3 md:gap-6 [@media(max-height:500px)]:gap-2">
                                        {/* Artwork - Responsive size */}
                                        <div className="w-40 h-40 md:w-80 md:h-80 lg:w-96 lg:h-96 [@media(max-height:500px)]:w-28 [@media(max-height:500px)]:h-28 mx-auto relative group">
                                            {(currentSong.thumbnail?.highRes || currentSong.thumbnail?.url) ? (
                                                <img
                                                    src={currentSong.thumbnail.highRes || currentSong.thumbnail.url}
                                                    alt="Thumbnail"
                                                    className="w-full h-full rounded-xl shadow-2xl object-cover"
                                                    onError={(e) => {
                                                        e.target.parentElement.innerHTML = '<div class="w-full h-full rounded-xl bg-neutral-800 flex items-center justify-center"><svg class="w-24 h-24 text-neutral-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-xl bg-neutral-800 flex items-center justify-center">
                                                    <Music className="w-24 h-24 text-neutral-600" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info & Controls */}
                                        <div className="space-y-2 md:space-y-4 [@media(max-height:500px)]:space-y-1">
                                            <div className="text-center space-y-0.5 sm:space-y-1">
                                                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white line-clamp-2" title={currentSong.info?.name || currentSong.title}>
                                                    {currentSong.info?.name || currentSong.title || "Unknown Title"}
                                                </h2>
                                                <p className="text-sm sm:text-base text-neutral-400 line-clamp-1">
                                                    {currentSong.authors?.map(a => a.name).join(", ") || "Unknown Artist"}
                                                </p>
                                            </div>

                                            {/* Progress */}
                                            <div className="space-y-1 sm:space-y-2">
                                                <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
                                                    <span className="w-10 text-right">{formatTime(progress)}</span>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max={duration || 100}
                                                        value={progress}
                                                        onChange={handleSeek}
                                                        className="flex-1 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                                                    />
                                                    <span className="w-10">{formatTime(duration)}</span>
                                                </div>
                                            </div>

                                            {/* Main Controls */}
                                            <div className="flex items-center justify-between">
                                                <button onClick={toggleRepeat} className={cn("transition-colors p-2", isRepeat ? "text-purple-400" : "text-neutral-400 hover:text-white")}>
                                                    <Repeat className="w-5 h-5" />
                                                </button>

                                                <div className="flex items-center gap-4">
                                                    <button onClick={playPrevious} disabled={currentIndex <= 0} className="text-white hover:text-neutral-300 transition-colors disabled:opacity-30">
                                                        <SkipBack className="w-7 h-7" />
                                                    </button>
                                                    <button
                                                        onClick={togglePlay}
                                                        className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-lg"
                                                    >
                                                        {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                                                    </button>
                                                    <button onClick={playNext} disabled={currentIndex >= queue.length - 1} className="text-white hover:text-neutral-300 transition-colors disabled:opacity-30">
                                                        <SkipForward className="w-7 h-7" />
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button onClick={handleDownload} className="text-neutral-400 hover:text-white transition-colors p-2">
                                                        <Download className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={toggleMaximize} className="text-neutral-400 hover:text-white transition-colors p-2 hidden md:block">
                                                        <Minimize2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Up Next Queue - Desktop Only */}
                                <div className="hidden md:flex flex-col w-[380px] min-w-[320px] bg-neutral-800/50 rounded-xl border border-white/5 overflow-hidden backdrop-blur-sm">
                                    <div className="p-3 border-b border-white/5 bg-neutral-800/70">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-base font-bold text-white">Up Next</h3>
                                            <span className="text-xs font-medium text-neutral-400 bg-white/5 px-2 py-1 rounded-full">
                                                {queue.length - currentIndex - 1} songs
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
                                        {queue.slice(currentIndex + 1).map((song, idx) => (
                                            <div
                                                key={song.videoId || idx}
                                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                                                onClick={() => playQueueTrack(currentIndex + 1 + idx)}
                                            >
                                                <div className="relative w-10 h-10 flex-shrink-0">
                                                    {(song.thumbnail?.highRes || song.thumbnail?.url) ? (
                                                        <img
                                                            src={song.thumbnail.highRes || song.thumbnail.url}
                                                            alt={song.title}
                                                            className="w-full h-full rounded object-cover"
                                                            onError={(e) => {
                                                                e.target.parentElement.innerHTML = '<div class="w-full h-full rounded bg-neutral-700 flex items-center justify-center"><svg class="w-5 h-5 text-neutral-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full rounded bg-neutral-700 flex items-center justify-center">
                                                            <Music className="w-5 h-5 text-neutral-500" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                                                        <Play className="w-4 h-4 text-white fill-current" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-medium text-white truncate">{song.title || "Unknown Title"}</h4>
                                                    <p className="text-xs text-neutral-400 truncate">{song.authors?.map(a => a.name).join(", ") || "Unknown Artist"}</p>
                                                </div>
                                                <span className="text-xs text-neutral-500">{song.duration}</span>
                                            </div>
                                        ))}
                                        {queue.length <= currentIndex + 1 && (
                                            <div className="flex flex-col items-center justify-center h-40 text-neutral-500 gap-2">
                                                <p className="text-sm">End of queue</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Mobile Up Next Queue - Appears below player controls */}
                                <div className="md:hidden w-full mt-4 md:mt-8 flex flex-col bg-neutral-800/50 rounded-xl border border-white/5 overflow-hidden backdrop-blur-sm max-h-[35vh] landscape:max-h-full landscape:flex-1 landscape:mt-0 landscape:ml-4">
                                    <div className="p-2 border-b border-white/5 bg-neutral-800/70 sticky top-0 z-10 [@media(max-height:500px)]:p-1.5">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm sm:text-base font-bold text-white">Up Next</h3>
                                            <span className="text-xs font-medium text-neutral-400 bg-white/5 px-2 py-1 rounded-full">
                                                {queue.length - currentIndex - 1} songs
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                        {queue.slice(currentIndex + 1).map((song, idx) => (
                                            <div
                                                key={song.videoId || idx}
                                                className="flex items-center gap-2 p-2 rounded-lg active:bg-white/20 transition-colors cursor-pointer"
                                                onClick={() => playQueueTrack(currentIndex + 1 + idx)}
                                            >
                                                <div className="relative w-12 h-12 flex-shrink-0">
                                                    {(song.thumbnail?.highRes || song.thumbnail?.url) ? (
                                                        <img
                                                            src={song.thumbnail.highRes || song.thumbnail.url}
                                                            alt={song.title}
                                                            className="w-full h-full rounded object-cover"
                                                            onError={(e) => {
                                                                e.target.parentElement.innerHTML = '<div class="w-full h-full rounded bg-neutral-700 flex items-center justify-center"><svg class="w-5 h-5 text-neutral-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full rounded bg-neutral-700 flex items-center justify-center">
                                                            <Music className="w-5 h-5 text-neutral-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-medium text-white truncate">{song.title || "Unknown Title"}</h4>
                                                    <p className="text-xs text-neutral-400 truncate">{song.authors?.map(a => a.name).join(", ") || "Unknown Artist"}</p>
                                                </div>
                                                <span className="text-xs text-neutral-500">{song.duration}</span>
                                            </div>
                                        ))}
                                        {queue.length <= currentIndex + 1 && (
                                            <div className="flex flex-col items-center justify-center h-32 text-neutral-500 gap-2">
                                                <p className="text-sm">End of queue</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="minimized"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed z-50 left-0 right-0 mx-auto max-w-5xl bottom-4 px-4"
                    >
                        <div className="w-full rounded-2xl p-3 bg-neutral-900 border border-white/10 shadow-xl flex flex-col gap-2">
                            {/* Progress Bar */}
                            <div className="flex items-center gap-2 text-xs text-neutral-400 px-1">
                                <span>{formatTime(progress)}</span>
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 100}
                                    value={progress}
                                    onChange={handleSeek}
                                    className="flex-1 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                                />
                                <span>{formatTime(duration)}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {(currentSong.thumbnail?.highRes || currentSong.thumbnail?.url) ? (
                                        <img
                                            src={currentSong.thumbnail.highRes || currentSong.thumbnail.url}
                                            alt="Thumbnail"
                                            className="w-12 h-12 rounded-lg object-cover shadow-md"
                                            onError={(e) => {
                                                e.target.parentElement.innerHTML = '<div class="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center"><svg class="w-6 h-6 text-neutral-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center">
                                            <Music className="w-6 h-6 text-neutral-600" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-white truncate text-sm">{currentSong.info?.name || currentSong.title || "Unknown Title"}</h3>
                                        <p className="text-xs text-neutral-400 truncate">{currentSong.authors?.map(a => a.name).join(", ") || "Unknown Artist"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 flex-1 justify-center">
                                    <button onClick={playPrevious} disabled={currentIndex <= 0} className="text-neutral-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                        <SkipBack className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={togglePlay}
                                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 hover:bg-neutral-200 transition-all shadow-lg"
                                    >
                                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                                    </button>
                                    <button onClick={playNext} disabled={currentIndex >= queue.length - 1} className="text-neutral-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                        <SkipForward className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 flex-1 justify-end">
                                    <button onClick={toggleRepeat} className={cn("transition-colors", isRepeat ? "text-purple-400" : "text-neutral-400 hover:text-white")}>
                                        <Repeat className="w-4 h-4" />
                                    </button>
                                    <button onClick={toggleMute} className="text-neutral-400 hover:text-white transition-colors">
                                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                    </button>
                                    <button onClick={toggleMaximize} className="text-neutral-400 hover:text-white transition-colors">
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
