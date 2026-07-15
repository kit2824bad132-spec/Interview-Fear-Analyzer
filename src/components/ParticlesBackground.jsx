import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function ParticlesBackground() {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const generateParticles = () => {
            const p = [];
            for (let i = 0; i < 40; i++) {
                p.push({
                    id: i,
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    size: Math.random() * 4 + 1,
                    duration: Math.random() * 20 + 10,
                    delay: Math.random() * 5
                });
            }
            setParticles(p);
        };
        generateParticles();
        window.addEventListener('resize', generateParticles);
        return () => window.removeEventListener('resize', generateParticles);
    }, []);

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute bg-neonCyan rounded-full opacity-30 shadow-[0_0_10px_#00f0ff]"
                    style={{ width: p.size, height: p.size }}
                    initial={{ x: p.x, y: p.y, opacity: 0 }}
                    animate={{
                        y: [p.y, p.y - 100, p.y + 100, p.y],
                        x: [p.x, p.x + 50, p.x - 50, p.x],
                        opacity: [0.1, 0.5, 0.1]
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        ease: "linear",
                        delay: p.delay
                    }}
                />
            ))}
        </div>
    );
}
