import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Check, X, Clock, Code2 } from 'lucide-react';

export default function TechnicalInterviewMode({ onClose }) {
    const [code, setCode] = useState('function solution(arr) {\n    // Write your code here\n    return arr;\n}');
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleRun = () => {
        setIsRunning(true);
        setTimeout(() => {
            setIsRunning(false);
            setOutput('> Output: [Finished]\n> All test cases passed!');
        }, 1500);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-4 z-50 glass-panel bg-[var(--bg-dark)]/95 backdrop-blur-3xl overflow-hidden flex flex-col border-2 border-[rgba(var(--neon-primary),0.5)] shadow-[0_0_50px_rgba(var(--neon-primary),0.2)]"
        >
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-white/5">
                <div className="flex items-center gap-3">
                    <Code2 className="text-[rgb(var(--neon-primary))] w-6 h-6" />
                    <h2 className="text-lg font-bold tracking-widest uppercase">Technical Assessment</h2>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 font-mono text-xl">
                        <Clock className={`w-5 h-5 ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`} />
                        <span className={timeLeft < 60 ? 'text-red-500 font-bold' : 'text-white'}>{formatTime(timeLeft)}</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Problem Description */}
                <div className="w-1/3 border-r border-white/10 p-6 flex flex-col gap-4 overflow-y-auto">
                    <span className="px-2 py-1 bg-white/10 rounded text-xs font-bold uppercase tracking-wider w-fit border border-white/20">Problem 1 / 3</span>
                    <h3 className="text-2xl font-bold text-white">Array Transformation</h3>
                    <p className="text-white/70 leading-relaxed font-sans mt-2">
                        Given an array of integers, write a function that squares each element and then sorts the entire array in ascending order.
                    </p>
                    <div className="mt-4 glass-panel p-4 bg-black/50 border-white/5 font-mono text-sm leading-relaxed text-white/90">
                        <p className="text-white/50 mb-1">// Example 1:</p>
                        <p>Input: <span className="text-[rgb(var(--neon-primary))]">[-4,-1,0,3,10]</span></p>
                        <p>Output: <span className="text-[rgb(var(--neon-primary))]">[0,1,9,16,100]</span></p>
                    </div>
                </div>

                {/* Code Editor */}
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 relative">
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full h-full bg-transparent text-white font-mono p-6 resize-none outline-none leading-relaxed focus:bg-white/5 transition-colors"
                            spellCheck="false"
                        />
                    </div>
                    
                    {/* Console & Actions */}
                    <div className="h-48 border-t border-white/10 flex flex-col">
                        <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-white/50">Console Output</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleRun}
                                    disabled={isRunning}
                                    className="px-4 py-1.5 rounded bg-[rgba(var(--neon-primary),0.2)] text-[rgb(var(--neon-primary))] border border-[rgba(var(--neon-primary),0.5)] flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:bg-[rgba(var(--neon-primary),0.3)] transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {isRunning ? <div className="w-4 h-4 rounded-full border-t-2 border-[rgb(var(--neon-primary))] animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                                    Run Code
                                </button>
                                <button 
                                    onClick={() => {
                                        alert("Code submitted successfully. Returning to behavioral interview.");
                                        onClose();
                                    }}
                                    className="px-4 py-1.5 rounded bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-white/90 transition-colors flex items-center gap-2 cursor-pointer"
                                >
                                    <Check className="w-4 h-4" /> Submit
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto font-mono text-sm text-[rgb(var(--neon-primary))] bg-black/40 whitespace-pre-wrap shadow-inner">
                            {output || 'Ready to run...'}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
