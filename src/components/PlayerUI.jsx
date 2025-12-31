import { Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Maximize2, Minimize2, Loader2, Download, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60), s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// Progress bar with gradient fill
function ProgressBar({ progress, duration, onSeekStart, onSeekEnd, onSeek, color = '#a855f7' }) {
    const pct = duration ? (progress / duration) * 100 : 0;
    return (
        <input
            type="range" min="0" max={duration || 100} step="0.1" value={progress}
            onMouseDown={onSeekStart} onTouchStart={onSeekStart}
            onMouseUp={onSeekEnd} onTouchEnd={onSeekEnd}
            onChange={onSeek}
            style={{ background: `linear-gradient(to right, ${color} ${pct}%, #404040 ${pct}%)` }}
            className="flex-1 h-1 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
    );
}

// Thumbnail display with fallback
function Thumbnail({ url, size = 'w-12 h-12', iconSize = 'w-6 h-6' }) {
    return url ? (
        <img src={url} alt="" className={`${size} rounded-lg object-cover`} />
    ) : (
        <div className={`${size} rounded-lg bg-neutral-800 flex items-center justify-center`}>
            <Music className={`${iconSize} text-neutral-600`} />
        </div>
    );
}

// Queue item row
function QueueItem({ song, index, isActive, onPlay }) {
    return (
        <div onClick={onPlay} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-purple-600/30' : 'hover:bg-white/5'}`}>
            <span className="text-sm text-neutral-500 w-6 text-center">{index + 1}</span>
            <Thumbnail url={song.thumbnail?.url} size="w-10 h-10" iconSize="w-4 h-4" />
            <div className="min-w-0 flex-1">
                <p className={`text-sm truncate ${isActive ? 'text-purple-400' : 'text-white'}`}>{song.title}</p>
                <p className="text-xs text-neutral-500 truncate">{song.artist}</p>
            </div>
        </div>
    );
}

// Maximized full-screen player view
export function MaximizedPlayer({ song, thumbnailUrl, isPlaying, isLoadingAudio, progress, duration, isRepeat, isMuted, songIsDownloaded, isDownloading, queue, currentIndex, onMinimize, onTogglePlay, onPrev, onNext, onRepeat, onMute, onDownload, onSeekStart, onSeekEnd, onSeek, onPlayQueueTrack }) {
    return (
        <motion.div key="maximized" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-neutral-950 pt-8">
            <div className="w-full h-full flex">
                {/* Player area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
                    <button onClick={onMinimize} className="absolute top-4 left-4 text-white/50 hover:text-white transition-colors">
                        <Minimize2 className="w-5 h-5" />
                    </button>

                    <Thumbnail url={thumbnailUrl} size="w-64 h-64 mb-8" iconSize="w-20 h-20" />

                    <h2 className="text-xl font-semibold text-white text-center mb-1 max-w-md line-clamp-2">{song.title}</h2>
                    <p className="text-neutral-400 text-sm mb-8">{song.artist || song.authors?.map(a => a.name).join(', ')}</p>

                    <div className="w-full max-w-md flex items-center gap-3 text-xs text-neutral-400 mb-6">
                        <span className="w-10 text-right">{formatTime(progress)}</span>
                        <ProgressBar progress={progress} duration={duration} onSeekStart={onSeekStart} onSeekEnd={onSeekEnd} onSeek={onSeek} />
                        <span className="w-10">{formatTime(duration)}</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <button onClick={onRepeat} className={isRepeat ? 'text-purple-400' : 'text-neutral-500 hover:text-white'}><Repeat className="w-5 h-5" /></button>
                        <button onClick={onPrev} disabled={currentIndex <= 0} className="text-white hover:text-neutral-300 disabled:opacity-30"><SkipBack className="w-7 h-7" /></button>
                        <button onClick={onTogglePlay} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all">
                            {isLoadingAudio ? <Loader2 className="w-6 h-6 animate-spin" /> : isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                        </button>
                        <button onClick={onNext} disabled={currentIndex >= queue.length - 1} className="text-white hover:text-neutral-300 disabled:opacity-30"><SkipForward className="w-7 h-7" /></button>
                        <button onClick={onDownload} disabled={isDownloading || songIsDownloaded} className={songIsDownloaded ? 'text-green-400' : 'text-neutral-500 hover:text-white disabled:opacity-50'}>
                            {songIsDownloaded ? <Check className="w-5 h-5" /> : isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                        </button>
                        <button onClick={onMute} className="text-neutral-500 hover:text-white">
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Queue panel */}
                <div className="w-[400px] border-l border-white/5 flex flex-col">
                    <div className="p-4"><h3 className="text-lg font-semibold text-white">Queue ({queue.length})</h3></div>
                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        <div className="space-y-1">
                            {queue.map((s, i) => <QueueItem key={s.videoId || i} song={s} index={i} isActive={i === currentIndex} onPlay={() => onPlayQueueTrack(i)} />)}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Minimized player bar
export function MinimizedPlayer({ song, thumbnailUrl, isPlaying, isLoadingAudio, progress, duration, isRepeat, isMuted, songIsDownloaded, isDownloading, currentIndex, queueLength, onMaximize, onTogglePlay, onPrev, onNext, onRepeat, onMute, onDownload, onSeekStart, onSeekEnd, onSeek }) {
    return (
        <motion.div key="minimized" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed z-50 left-4 right-4 bottom-4 max-w-5xl mx-auto">
            <div className="w-full rounded-2xl p-4 bg-neutral-900/95 border border-white/10 shadow-xl backdrop-blur-xl flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span className="w-10 text-right">{formatTime(progress)}</span>
                    <ProgressBar progress={progress} duration={duration} onSeekStart={onSeekStart} onSeekEnd={onSeekEnd} onSeek={onSeek} color="#a855f7" />
                    <span className="w-10">{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Thumbnail url={thumbnailUrl} />
                        <div className="min-w-0">
                            <h3 className="font-semibold text-white truncate text-sm">{song.title}</h3>
                            <p className="text-xs text-neutral-400 truncate">{song.artist || song.authors?.map(a => a.name).join(', ')}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-1 justify-center">
                        <button onClick={onPrev} disabled={currentIndex <= 0} className="text-neutral-400 hover:text-white disabled:opacity-30"><SkipBack className="w-5 h-5" /></button>
                        <button onClick={onTogglePlay} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all">
                            {isLoadingAudio ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </button>
                        <button onClick={onNext} disabled={currentIndex >= queueLength - 1} className="text-neutral-400 hover:text-white disabled:opacity-30"><SkipForward className="w-5 h-5" /></button>
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end">
                        <button onClick={onRepeat} className={isRepeat ? 'text-purple-400' : 'text-neutral-400 hover:text-white'}><Repeat className="w-4 h-4" /></button>
                        <button onClick={onDownload} disabled={isDownloading || songIsDownloaded} className={songIsDownloaded ? 'text-green-400' : 'text-neutral-400 hover:text-white disabled:opacity-50'}>
                            {songIsDownloaded ? <Check className="w-4 h-4" /> : isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </button>
                        <button onClick={onMute} className="text-neutral-400 hover:text-white">{isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
                        <button onClick={onMaximize} className="text-neutral-400 hover:text-white"><Maximize2 className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
