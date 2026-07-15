import React from 'react';
import { Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ta', name: 'Tamil' }
];

export default function LanguageSelector({ selected, onSelect }) {
    return (
        <div className="flex flex-col items-center gap-4 mt-8">
            <h3 className="text-white/70 flex items-center gap-2">
                <Globe className="w-5 h-5 text-neonPrimary" /> Select Language
            </h3>
            <div className="flex gap-4">
                {languages.map((lang) => (
                    <motion.button
                        key={lang.code}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelect(lang.code)}
                        className={`px-6 py-2 rounded-full border transition-all ${
                            selected === lang.code 
                            ? 'border-transparent neon-border-primary bg-white/10 text-white shadow-[0_0_15px_rgba(var(--neon-primary),0.5)]' 
                            : 'border-white/20 text-white/50 hover:text-white glass-panel'
                        }`}
                    >
                        {lang.name}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
