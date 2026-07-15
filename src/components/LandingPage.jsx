import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import ResumeUploader from './ResumeUploader';

export default function LandingPage({ onStart }) {
    const [isHovered, setIsHovered] = useState(false);
    const [language, setLanguage] = useState('en');
    const [resumeData, setResumeData] = useState(null);

    const handleStart = () => {
        if (!resumeData) {
            alert("Please upload a resume first!");
            return;
        }
        onStart({ language, resumeData });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center justify-center h-full text-center relative z-10 w-full pb-12 overflow-y-auto"
        >
            <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="mb-8 mt-12 shrink-0"
            >
                <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-4 neon-text-primary px-4">
                    Interview Fear Analyzer
                </h1>
                <p className="text-xl md:text-2xl text-white/70 tracking-wider">
                    Master Confidence with AI
                </p>
            </motion.div>

            <LanguageSelector selected={language} onSelect={setLanguage} />
            
            <ResumeUploader onUpload={setResumeData} />

            <div className="h-24 mt-8 flex items-center justify-center w-full shrink-0">
                <AnimatePresence>
                    {resumeData && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            onClick={handleStart}
                            className="relative group px-12 py-5 rounded-full glass-panel neon-border-primary flex items-center justify-center gap-3 overflow-hidden cursor-pointer shadow-[0_0_20px_rgba(var(--neon-primary),0.4)] hover:shadow-[0_0_30px_rgba(var(--neon-primary),0.8)] transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(var(--neon-primary),0.2)] to-[rgba(var(--neon-secondary),0.2)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full blur-md" />

                            <span className="relative z-10 text-xl font-semibold uppercase tracking-widest text-white flex items-center gap-3">
                                Start Experience <Play className="w-5 h-5 fill-white" />
                            </span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
