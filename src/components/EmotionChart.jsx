import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function EmotionChart({ dataPoints }) {
    const width = 300;
    const height = 100;
    const padding = 10;
    const maxPoints = 20; // Keep window of last 20 points
    
    // Slice data points to keep chart moving forward
    const displayPoints = dataPoints.slice(-maxPoints);

    const pathData = useMemo(() => {
        if (displayPoints.length === 0) return '';
        const stepX = (width - padding * 2) / Math.max(displayPoints.length - 1, 1);
        const path = displayPoints.map((point, index) => {
            const x = padding + index * stepX;
            const y = height - padding - ((point / 100) * (height - padding * 2));
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
        return path;
    }, [displayPoints]);

    return (
        <div className="w-full h-full relative flex items-center justify-center p-2" style={{ minHeight: 120 }}>
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible drop-shadow-[0_0_10px_rgba(var(--neon-primary),0.8)]">
                {/* Grid lines */}
                <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.2)" />
                
                {/* Data Path */}
                {pathData && (
                    <motion.path
                        d={pathData}
                        fill="none"
                        stroke="rgb(var(--neon-primary))"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
                
                {displayPoints.length > 0 && (
                    <motion.circle
                        cx={padding + (displayPoints.length - 1) * ((width - padding * 2) / Math.max(displayPoints.length - 1, 1))}
                        cy={height - padding - ((displayPoints[displayPoints.length - 1] / 100) * (height - padding * 2))}
                        r="5"
                        fill="#fff"
                        className="drop-shadow-[0_0_8px_#fff]"
                    />
                )}
            </svg>
        </div>
    );
}
