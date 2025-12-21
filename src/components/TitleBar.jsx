/**
 * macOS-style title bar
 */
export default function TitleBar() {
    return (
        <div className="title-bar fixed top-0 left-0 right-0 h-8 bg-neutral-900/80 backdrop-blur-xl z-[100] flex items-center justify-center border-b border-white/5">
            <span className="text-xs text-neutral-500 font-medium">MusicLov</span>
        </div>
    );
}
