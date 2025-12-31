/**
 * MusicLov - Main App Component
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerProvider } from './context/PlayerContext';
import TitleBar from './components/TitleBar';
import NavBar from './components/NavBar';
import HomeView from './components/HomeView';
import BrowseView from './components/BrowseView';
import LibraryView from './components/LibraryView';
import Player from './components/Player';


// Main App content with navigation
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
        <div className="min-h-screen bg-neutral-950 text-white relative overflow-auto">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
            </div>

            <NavBar currentView={currentView} onBack={goBack} onHome={goHome} onLibrary={goLibrary} />

            <div className="pt-20 relative z-10">
                <AnimatePresence mode="wait">
                    {currentView === 'home' ? (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <HomeView
                                onCategoryClick={handleCategoryClick}
                                searchResults={searchResults}
                                setSearchResults={setSearchResults}
                            />
                        </motion.div>
                    ) : currentView === 'browse' && selectedCategory ? (
                        <motion.div
                            key="browse"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <BrowseView category={selectedCategory} onBack={goBack} />
                        </motion.div>
                    ) : currentView === 'library' ? (
                        <motion.div
                            key="library"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <LibraryView />
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </div>
    );
}

function App() {
    return (
        <PlayerProvider>
            <div className="h-screen flex flex-col">
                <TitleBar />
                <AppContent />
                <Player />
            </div>
        </PlayerProvider>
    );
}

export default App;
