/**
 * Navigation bar with Home, Back, and Library buttons
 */
import { Home, ArrowLeft, Library } from 'lucide-react';

export default function NavBar({ currentView, onBack, onHome, onLibrary }) {
    return (
        <div className="fixed top-8 left-0 right-0 h-12 bg-neutral-950/90 backdrop-blur-xl z-50 flex items-center justify-between px-4 border-b border-white/5">
            <div className="flex items-center gap-2">
                {currentView !== 'home' && currentView !== 'library' && (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                    </button>
                )}
                <button
                    onClick={onHome}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all text-sm ${currentView === 'home'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white'
                        }`}
                >
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                </button>
            </div>
            <button
                onClick={onLibrary}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all text-sm ${currentView === 'library'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white'
                    }`}
            >
                <Library className="w-4 h-4" />
                <span>Library</span>
            </button>
        </div>
    );
}
