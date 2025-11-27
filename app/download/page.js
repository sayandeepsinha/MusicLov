"use client";

import { motion } from "framer-motion";
import { Monitor, Apple, Smartphone, Download, Check } from "lucide-react";

const platforms = [
    {
        name: "Windows",
        icon: Monitor,
        version: "v1.0.0",
        size: "65 MB",
        color: "from-blue-500 to-cyan-500",
        features: ["High Quality Audio", "Offline Mode", "System Integration"]
    },
    {
        name: "macOS",
        icon: Apple,
        version: "v1.0.0",
        size: "72 MB",
        color: "from-neutral-200 to-neutral-400",
        features: ["Native Performance", "Touch Bar Support", "Retina Ready"]
    },
    {
        name: "Android",
        icon: Smartphone,
        version: "v1.0.0",
        size: "45 MB",
        color: "from-green-500 to-emerald-500",
        features: ["Background Play", "Battery Saver", "Material You"]
    }
];

export default function DownloadPage() {
    return (
        <main className="min-h-screen bg-neutral-950 text-white p-6 pt-20 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-purple-900/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-20"
                >
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
                        Download MusicLov
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
                        Experience music like never before with our native applications.
                        Better performance, offline playback, and system integration.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {platforms.map((platform, i) => (
                        <motion.div
                            key={platform.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 + 0.2 }}
                            className="group relative bg-neutral-900/50 border border-white/10 rounded-3xl p-8 hover:bg-neutral-800/50 transition-all hover:border-white/20 hover:-translate-y-2"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${platform.color} opacity-0 group-hover:opacity-5 transition-opacity rounded-3xl`} />

                            <div className="flex items-center justify-between mb-8">
                                <div className={`p-4 rounded-2xl bg-gradient-to-br ${platform.color} bg-opacity-10`}>
                                    <platform.icon className="w-8 h-8 text-white" />
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-mono text-neutral-400">{platform.version}</div>
                                    <div className="text-xs text-neutral-500">{platform.size}</div>
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold mb-6">{platform.name}</h3>

                            <ul className="space-y-3 mb-8">
                                {platform.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-neutral-400">
                                        <Check className="w-5 h-5 text-purple-400" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <button className="w-full py-4 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors">
                                <Download className="w-5 h-5" />
                                Download
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </main>
    );
}
