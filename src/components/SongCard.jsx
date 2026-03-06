import { Play, Music } from 'lucide-react';
import { upgradeThumbnailUrl } from '../common/thumbnailProvider';

export default function SongCard({ song, onClick }) {
    const thumbUrl = upgradeThumbnailUrl(
        song.thumbnail?.url || song.thumbnail?.thumbnails?.[0]?.url,
        song.videoId || song.id
    );

    return (
        <div onClick={onClick} className="flex flex-col gap-2 p-3 bg-white border border-blue-50 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition cursor-pointer">
            <div className="relative aspect-[5/3] w-full rounded-lg bg-blue-50 flex flex-col items-center justify-center overflow-hidden">
                {thumbUrl ? (
                    <img src={thumbUrl} alt={song.title} className="w-full h-full object-cover" />
                ) : (
                    <Music className="w-8 h-8 text-blue-300" />
                )}
                <div className="absolute bottom-2 right-2 w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center shadow hover:bg-blue-500 transition">
                    <Play className="w-4 h-4 text-white ml-0.5 fill-current" />
                </div>
            </div>
            <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 truncate">{song.title}</h3>
                <p className="text-xs text-gray-500 truncate">{song.artist}</p>
            </div>
        </div>
    );
}
