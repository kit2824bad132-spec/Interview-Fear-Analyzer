import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, X, Palette } from 'lucide-react';

const themes = [
    { id: 'default', name: 'Neon Blue', color: 'rgb(0, 240, 255)' },
    { id: 'purple', name: 'Purple Glow', color: 'rgb(157, 0, 255)' },
    { id: 'green', name: 'Green Cyber', color: 'rgb(0, 255, 128)' },
    { id: 'red', name: 'Red Energy', color: 'rgb(255, 50, 50)' }
];

export default function ThemeSwitcher() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentTheme, setCurrentTheme] = useState('default');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme-preference') || 'default';
        setCurrentTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const changeTheme = (themeId) => {
        setCurrentTheme(themeId);
        localStorage.setItem('theme-preference', themeId);
        document.documentElement.setAttribute('data-theme', themeId);
    };

    return (
        <div className="fixed top-6 right-6 z-50">
            <motion.button
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 rounded-full glass-panel flex items-center justify-center neon-border-primary text-white cursor-pointer"
            >
                <Palette className="w-5 h-5" />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -20, x: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20, x: 20 }}
                        className="absolute top-16 right-0 w-64 glass-panel p-4"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Settings2 className="w-4 h-4 text-neonPrimary" /> Theme Settings
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white cursor-pointer p-1 rounded-md hover:bg-white/10 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            {themes.map((theme) => (
                                <motion.button
                                    key={theme.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => changeTheme(theme.id)}
                                    className={`relative flex items-center justify-between p-3 rounded-xl border border-white/5 hover:border-white/20 transition-all ${
                                        currentTheme === theme.id ? 'bg-white/10' : 'bg-transparent'
                                    }`}
                                >
                                    <span className="text-sm text-white">{theme.name}</span>
                                    <div 
                                        className="w-4 h-4 rounded-full" 
                                        style={{ 
                                            backgroundColor: theme.color, 
                                            boxShadow: `0 0 10px ${theme.color}` 
                                        }} 
                                    />
                                    {currentTheme === theme.id && (
                                        <div className="absolute inset-0 rounded-xl neon-border-primary opacity-50 pointer-events-none" />
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
