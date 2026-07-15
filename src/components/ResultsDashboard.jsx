import React from 'react';
import { motion } from 'framer-motion';
import { Target, Activity, Eye, Play } from 'lucide-react';

export default function ResultsDashboard({ data, onRestart }) {
    if (!data) data = { confidence: 0, clarity: 0, posture: 0, skills: [] };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100, damping: 20 } }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            className="w-full max-w-5xl p-8 relative z-10 flex flex-col items-center justify-center min-h-screen"
        >
            <motion.div variants={itemVariants} className="mb-16 text-center">
                <h1 className="text-4xl md:text-6xl font-black mb-4 neon-text-purple uppercase tracking-tight">
                    Analysis Complete
                </h1>
                <p className="text-xl text-gray-400 tracking-widest">Great job. Here is your AI assessment.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 w-full">
                <motion.div variants={itemVariants} className="glass-panel p-8 flex flex-col items-center justify-center gap-6 group hover:-translate-y-2 transition-transform cursor-pointer border-[rgba(var(--neon-primary),0.3)]">
                    <Activity className="w-10 h-10 text-[rgb(var(--neon-primary))] opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="text-7xl font-black text-[rgb(var(--neon-primary))] font-mono tracking-tighter shadow-neonPrimary">{data.confidence}%</div>
                    <div className="text-gray-400 tracking-widest text-xs uppercase font-bold">Confidence Score</div>
                </motion.div>

                <motion.div variants={itemVariants} className="glass-panel p-8 flex flex-col items-center justify-center gap-6 group hover:-translate-y-2 transition-transform cursor-pointer">
                    <Target className="w-10 h-10 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="text-7xl font-black text-white font-mono tracking-tighter">{data.clarity}%</div>
                    <div className="text-gray-400 tracking-widest text-xs uppercase font-bold">Voice Clarity</div>
                </motion.div>

                <motion.div variants={itemVariants} className="glass-panel p-8 flex flex-col items-center justify-center gap-6 group hover:-translate-y-2 transition-transform cursor-pointer border-[rgba(var(--neon-secondary),0.3)]">
                    <Eye className="w-10 h-10 text-[rgb(var(--neon-secondary))] opacity-50 group-hover:opacity-100 transition-opacity" />
                    <div className="text-7xl font-black text-[rgb(var(--neon-secondary))] font-mono tracking-tighter">{data.posture || 85}%</div>
                    <div className="text-gray-400 tracking-widest text-xs uppercase font-bold">Posture Score</div>
                </motion.div>
            </div>

            <motion.div variants={itemVariants} className="flex justify-center flex-wrap gap-4">
                <button
                    onClick={onRestart}
                    className="px-10 py-4 glass-panel hover:bg-white/10 transition-colors uppercase tracking-widest font-bold text-sm cursor-pointer rounded-full flex items-center gap-2 border border-white/20 hover:border-white/40"
                >
                    Return Home
                </button>
            </motion.div>
        </motion.div>
    );
}
