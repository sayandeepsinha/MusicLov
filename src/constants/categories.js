/**
 * Category constants for trending sections
 */
import { Star, Globe, TrendingUp, Flame } from 'lucide-react';

export const CATEGORIES = [
    { id: 'hindi', title: 'Top Hindi', query: 'Bollywood hits songs 2024', icon: Star, color: 'from-orange-500 to-pink-500', limit: 30 },
    { id: 'english', title: 'Top English', query: 'Billboard Hot 100 songs English pop', icon: Globe, color: 'from-blue-500 to-purple-500', limit: 30 },
    { id: 'global', title: 'Global Top 50', query: 'Spotify top 50 global hits 2024', icon: TrendingUp, color: 'from-green-500 to-teal-500', limit: 50 },
    { id: 'trending', title: 'Trending Now', query: 'viral trending songs 2024', icon: Flame, color: 'from-red-500 to-orange-500', limit: 30 },
];
