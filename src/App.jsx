/**
 * MusicLov - Main App Component
 */
import { useState } from 'react';
import { PlayerProvider } from './context/PlayerContext';
import TitleBar from './components/TitleBar';
import NavBar from './components/NavBar';
import HomeView from './components/HomeView';
import BrowseView from './components/BrowseView';
import LibraryView from './components/LibraryView';
import Player from './components/Player';

function AppContent() {
    const [currentView, setCurrentView] = useState('home'); // 'home' | 'browse' | 'library'
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchResults, setSearchResults] = useState(null);
    const [history, setHistory] = useState([]);

    const navigateTo = (view, category = null) => {
        setHistory(prev => [...prev, { view: currentView, category: selectedCategory }]);
        setCurrentView(view);
        setSelectedCategory(category);
    };

    const goBack = () => {
        if (history.length > 0) {
            const prev = history[history.length - 1];
            setHistory(h => h.slice(0, -1));
            setCurrentView(prev.view);
            setSelectedCategory(prev.category);
        } else {
            setCurrentView('home');
            setSelectedCategory(null);
        }
    };

    const goHome = () => {
        setCurrentView('home');
        setSelectedCategory(null);
        setSearchResults(null);
        setHistory([]);
    };

    const goLibrary = () => {
        setCurrentView('library');
        setSelectedCategory(null);
        setSearchResults(null);
        setHistory([]);
    };

    const handleCategoryClick = (category) => {
        navigateTo('browse', category);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative pb-24">
            <NavBar currentView={currentView} onBack={goBack} onHome={goHome} onLibrary={goLibrary} />

            <div className="flex-1 overflow-auto p-4">
                {currentView === 'home' ? (
                    <HomeView
                        onCategoryClick={handleCategoryClick}
                        searchResults={searchResults}
                        setSearchResults={setSearchResults}
                    />
                ) : currentView === 'browse' && selectedCategory ? (
                    <BrowseView category={selectedCategory} onBack={goBack} />
                ) : currentView === 'library' ? (
                    <LibraryView />
                ) : null}
            </div>
        </div>
    );
}

function App() {
    return (
        <PlayerProvider>
            <div className="h-screen w-full flex flex-col font-sans text-gray-800 bg-white">
                <TitleBar />
                <AppContent />
                <Player />
            </div>
        </PlayerProvider>
    );
}

export default App;
