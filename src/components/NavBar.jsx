import { Home, ArrowLeft, Library } from 'lucide-react';

export default function NavBar({ currentView, onBack, onHome, onLibrary }) {
    return (
        <div className="flex items-center justify-between p-3 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-2">
                {currentView !== 'home' && currentView !== 'library' && (
                    <button onClick={onBack} className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-100 text-gray-800 hover:bg-blue-200">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Back</span>
                    </button>
                )}
                <button onClick={onHome} className={`flex items-center gap-1 px-3 py-1.5 rounded transition bg-blue-100 text-gray-800 hover:bg-blue-200 ${currentView === 'home' ? 'bg-blue-200 font-bold' : ''}`}>
                    <Home className="w-4 h-4" />
                    <span className="text-sm">Home</span>
                </button>
            </div>
            <button onClick={onLibrary} className={`flex items-center gap-1 px-3 py-1.5 rounded transition bg-blue-100 text-gray-800 hover:bg-blue-200 ${currentView === 'library' ? 'bg-blue-200 font-bold' : ''}`}>
                <Library className="w-4 h-4" />
                <span className="text-sm">Library</span>
            </button>
        </div>
    );
}
