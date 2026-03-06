import { Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Maximize2, Minimize2, Loader2 } from 'lucide-react';

const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60), s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

function ProgressBar({ progress, duration, onSeekStart, onSeekEnd, onSeek }) {
    const pct = duration ? (progress / duration) * 100 : 0;
    return (
        <div className="flex-1 relative flex items-center h-4 group cursor-pointer" onMouseDown={onSeekStart} onTouchStart={onSeekStart} onMouseUp={onSeekEnd} onTouchEnd={onSeekEnd} onMouseLeave={onSeekEnd}>
            <input
                type="range" min="0" max={duration || 100} step="0.1" value={progress}
                onChange={onSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 group-hover:bg-blue-500 transition-colors pointer-events-none" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

import { upgradeThumbnailUrl } from '../common/thumbnailProvider';

function Thumbnail({ url, sizeClass = "w-12 h-12", iconSizeClass = "w-6 h-6" }) {
    return url ? (
        <img src={url} alt="thumbnail" className={`${sizeClass} rounded-lg object-cover bg-gray-50 border border-blue-50 shadow-sm`} />
    ) : (
        <div className={`${sizeClass} rounded-lg bg-blue-50 flex items-center justify-center text-blue-300 border border-blue-100`}>
            <Music className={iconSizeClass} />
        </div>
    );
}

function QueueItem({ song, index, isActive, onPlay }) {
    const thumbUrl = upgradeThumbnailUrl(
        song.thumbnail?.url || song.thumbnail?.thumbnails?.[0]?.url,
        song.videoId || song.id
    );

    return (
        <div onClick={onPlay} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition ${isActive ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'}`}>
            <span className={`text-xs w-5 text-center font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{index + 1}</span>
            <Thumbnail url={thumbUrl} sizeClass="w-16 aspect-[5/3] shrink-0" iconSizeClass="w-5 h-5" />
            <div className="min-w-0 flex-1">
                <p className={`text-sm truncate font-medium ${isActive ? 'text-blue-800' : 'text-gray-800'}`}>{song.title}</p>
                <p className="text-xs truncate text-gray-500">{song.artist}</p>
            </div>
        </div>
    );
}

export function MaximizedPlayer({ song, thumbnailUrl, isPlaying, isLoadingAudio, progress, duration, isRepeat, isMuted, queue, currentIndex, onMinimize, onTogglePlay, onPrev, onNext, onRepeat, onMute, onSeekStart, onSeekEnd, onSeek, onPlayQueueTrack }) {
    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col pt-8">
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden pb-4">
                <div className="flex-1 flex flex-col items-center justify-center p-8 relative min-h-0 overflow-y-auto">
                    <button onClick={onMinimize} className="absolute top-4 left-4 p-2 text-gray-400 hover:bg-blue-50 hover:text-gray-800 rounded-lg transition">
                        <Minimize2 className="w-6 h-6" />
                    </button>

                    <div className="mb-6 shadow-xl rounded-2xl overflow-hidden ring-4 ring-blue-50 flex-shrink-0">
                        <Thumbnail url={thumbnailUrl} sizeClass="w-[320px] aspect-[5/3] md:w-[480px]" iconSizeClass="w-20 h-20" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-1 max-w-lg line-clamp-2">{song.title}</h2>
                    <p className="text-gray-500 text-base mb-8 max-w-lg truncate">{song.artist || song.authors?.map(a => a.name).join(', ')}</p>

                    <div className="w-full max-w-md flex items-center gap-4 text-xs font-medium text-gray-500 mb-8 px-4">
                        <span className="w-10 text-right">{formatTime(progress)}</span>
                        <ProgressBar progress={progress} duration={duration} onSeekStart={onSeekStart} onSeekEnd={onSeekEnd} onSeek={onSeek} />
                        <span className="w-10">{formatTime(duration)}</span>
                    </div>

                    <div className="flex items-center justify-center gap-6">
                        <button onClick={onRepeat} className={`p-2 rounded-full transition ${isRepeat ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-100'}`}><Repeat className="w-5 h-5" /></button>
                        <button onClick={onPrev} disabled={currentIndex <= 0} className="p-2 text-gray-600 hover:text-blue-500 disabled:opacity-30 transition"><SkipBack className="w-8 h-8 fill-current" /></button>
                        <button onClick={onTogglePlay} className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 shadow-lg hover:shadow-xl hover:scale-105 transition active:scale-95">
                            {isLoadingAudio ? <Loader2 className="w-6 h-6 animate-spin" /> : isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </button>
                        <button onClick={onNext} disabled={currentIndex >= queue.length - 1} className="p-2 text-gray-600 hover:text-blue-500 disabled:opacity-30 transition"><SkipForward className="w-8 h-8 fill-current" /></button>
                        <button onClick={onMute} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition">
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-blue-50 flex flex-col bg-gray-50/50">
                    <div className="p-4 border-b border-blue-50">
                        <h3 className="text-lg font-bold text-gray-800">Up Next <span className="text-sm font-normal text-gray-400">({queue.length})</span></h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        <div className="flex flex-col gap-1">
                            {queue.map((s, i) => <QueueItem key={s.videoId || i} song={s} index={i} isActive={i === currentIndex} onPlay={() => onPlayQueueTrack(i)} />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function MinimizedPlayer({ song, thumbnailUrl, isPlaying, isLoadingAudio, progress, duration, isRepeat, isMuted, currentIndex, queueLength, onMaximize, onTogglePlay, onPrev, onNext, onRepeat, onMute, onSeekStart, onSeekEnd, onSeek }) {
    return (
        <div className="fixed bottom-0 left-0 right-0 p-3 pb-4 pointer-events-none">
            <div className="max-w-5xl mx-auto rounded-2xl bg-white border border-blue-100 shadow-xl pointer-events-auto overflow-hidden flex flex-col p-3 px-4 transition-all">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Thumbnail url={thumbnailUrl} sizeClass="w-16 aspect-[5/3] shrink-0" />
                        <div className="min-w-0 flex flex-col justify-center">
                            <h3 className="font-semibold text-gray-800 truncate text-sm leading-tight mb-0.5">{song.title}</h3>
                            <p className="text-xs text-gray-500 truncate leading-tight">{song.artist || song.authors?.map(a => a.name).join(', ')}</p>
                        </div>
                    </div>

                    <div className="flex flex-col flex-1 shrink-0 max-w-[300px] hidden sm:flex">
                        <div className="flex items-center justify-center gap-4 mb-1">
                            <button onClick={onPrev} disabled={currentIndex <= 0} className="text-gray-400 hover:text-blue-500 disabled:opacity-30 transition"><SkipBack className="w-5 h-5 fill-current" /></button>
                            <button onClick={onTogglePlay} className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 shadow hover:scale-105 active:scale-95 transition">
                                {isLoadingAudio ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                            </button>
                            <button onClick={onNext} disabled={currentIndex >= queueLength - 1} className="text-gray-400 hover:text-blue-500 disabled:opacity-30 transition"><SkipForward className="w-5 h-5 fill-current" /></button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400 w-full px-2">
                            <ProgressBar progress={progress} duration={duration} onSeekStart={onSeekStart} onSeekEnd={onSeekEnd} onSeek={onSeek} />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end shrink-0 text-gray-400">
                        <button onClick={onRepeat} className={`p-1.5 rounded-full hover:bg-blue-50 transition ${isRepeat ? 'text-blue-600 bg-blue-50' : 'hover:text-gray-800'}`}><Repeat className="w-4 h-4" /></button>
                        <button onClick={onMute} className="p-1.5 rounded-full hover:bg-blue-50 hover:text-gray-800 transition">{isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
                        <div className="w-[1px] h-4 bg-gray-100 mx-1"></div>
                        <button onClick={onMaximize} className="p-1.5 rounded-full hover:bg-blue-50 hover:text-gray-800 transition"><Maximize2 className="w-4 h-4" /></button>
                    </div>

                    {/* Mobile play button */}
                    <div className="sm:hidden flex items-center gap-2">
                        <button onClick={onTogglePlay} className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            {isLoadingAudio ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </button>
                    </div>
                </div>
                {/* Mobile progress bar */}
                <div className="sm:hidden mt-2 px-1">
                    <ProgressBar progress={progress} duration={duration} onSeekStart={onSeekStart} onSeekEnd={onSeekEnd} onSeek={onSeek} />
                </div>
            </div>
        </div>
    );
}
