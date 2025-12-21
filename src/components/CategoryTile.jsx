/**
 * Category tile for trending sections
 */
import { motion } from 'framer-motion';

export default function CategoryTile({ category, onClick }) {
    const Icon = category.icon;
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`relative p-6 rounded-2xl cursor-pointer overflow-hidden bg-gradient-to-br ${category.color} shadow-lg`}
        >
            <div className="absolute top-0 right-0 w-24 h-24 opacity-20">
                <Icon className="w-full h-full" />
            </div>
            <div className="relative z-10">
                <Icon className="w-8 h-8 text-white mb-3" />
                <h3 className="text-xl font-bold text-white">{category.title}</h3>
                <p className="text-white/70 text-sm mt-1">Explore top songs</p>
            </div>
        </motion.div>
    );
}
