"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Library, Smartphone, ArrowRight, Download, Play, Music, Trash2 } from "lucide-react";
import Link from "next/link";
import { getAllSongs, deleteSong } from "@/lib/db";
import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";

export default function LibraryPage() {
    const [activeTab, setActiveTab] = useState("downloads");
    const [downloads, setDownloads] = useState([]);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [songToDelete, setSongToDelete] = useState(null);
    const { playSong } = usePlayer();

    useEffect(() => {
        loadDownloads();
    }, []);

    const loadDownloads = async () => {
        try {
            const songs = await getAllSongs();
            setDownloads(songs.reverse()); // Newest first
        } catch (error) {
            console.error("Failed to load downloads", error);
        }
    };

    const handlePlayOffline = (song) => {
        // Create a blob URL for the song
        const blobUrl = URL.createObjectURL(song.blob);

        playSong({
            key: song.videoId,
            videoId: song.videoId,
            title: song.title,
            thumbnail: { url: song.thumbnail },
            authors: [{ name: song.artist }],
            src: blobUrl, // Custom property for offline playback
            isOffline: true
        });
    };

    const handleDeleteClick = (e, song) => {
        e.stopPropagation();
        setSongToDelete(song);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (songToDelete) {
            await deleteSong(songToDelete.videoId);
            loadDownloads();
            setDeleteModalOpen(false);
            setSongToDelete(null);
        }
    };

    const cancelDelete = () => {
        setDeleteModalOpen(false);
        setSongToDelete(null);
    };

    return (
        <main className="min-h-screen bg-neutral-950 text-white p-6 pt-24 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-neutral-900 rounded-2xl border border-white/10">
                        <Library className="w-8 h-8 text-purple-400" />
                    </div>
                    <h1 className="text-4xl font-bold">Your Library</h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-white/10 pb-1">
                    <button
                        onClick={() => setActiveTab("downloads")}
                        className={cn(
                            "px-4 py-2 font-medium text-lg transition-colors relative",
                            activeTab === "downloads" ? "text-white" : "text-neutral-400 hover:text-white"
                        )}
                    >
                        Downloads
                        {activeTab === "downloads" && (
                            <motion.div layoutId="activeTab" className="absolute bottom-[-5px] left-0 right-0 h-1 bg-purple-500 rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("playlists")}
                        className={cn(
                            "px-4 py-2 font-medium text-lg transition-colors relative",
                            activeTab === "playlists" ? "text-white" : "text-neutral-400 hover:text-white"
                        )}
                    >
                        Playlists
                        {activeTab === "playlists" && (
                            <motion.div layoutId="activeTab" className="absolute bottom-[-5px] left-0 right-0 h-1 bg-purple-500 rounded-full" />
                        )}
                    </button>
                </div>

                {/* Content */}
                {activeTab === "downloads" ? (
                    <div className="space-y-4">
                        {downloads.length === 0 ? (
                            <div className="text-center py-20 text-neutral-400">
                                <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">No downloads yet.</p>
                                <p className="text-sm">Play a song and click the download button to save it here.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {downloads.map((song) => (
                                    <motion.div
                                        key={song.videoId}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => handlePlayOffline(song)}
                                        className="group bg-neutral-900/50 border border-white/5 hover:border-white/10 rounded-xl p-3 cursor-pointer hover:bg-neutral-800/50 transition-all flex items-center gap-4"
                                    >
                                        <div className="relative w-16 h-16 flex-shrink-0">
                                            {song.thumbnail ? (
                                                <img src={song.thumbnail} alt={song.title} className="w-full h-full rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-neutral-800 rounded-lg flex items-center justify-center">
                                                    <Music className="w-8 h-8 text-neutral-600" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                                                <Play className="w-8 h-8 text-white fill-current" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white truncate">{song.title}</h3>
                                            <p className="text-sm text-neutral-400 truncate">{song.artist}</p>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteClick(e, song)}
                                            className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12 bg-neutral-900/30 rounded-3xl border border-white/5"
                    >
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-neutral-900 border border-white/10 mb-6 shadow-xl">
                            <Smartphone className="w-10 h-10 text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4">Playlists are better in the App</h2>
                        <p className="text-neutral-400 max-w-md mx-auto mb-8">
                            To create and manage playlists, please download our native application for the best experience.
                        </p>
                        <Link
                            href="/download"
                            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-neutral-200 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Download Native App
                        </Link>
                    </motion.div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                    >
                        <h3 className="text-xl font-bold mb-2">Delete Song?</h3>
                        <p className="text-neutral-400 mb-6">
                            Are you sure you want to delete <span className="text-white font-medium">"{songToDelete?.title}"</span> from your downloads?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/5 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </main>
    );
}
