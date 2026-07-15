import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import EmotionChart from './EmotionChart';
import TechnicalInterviewMode from './TechnicalInterviewMode';
import { Code, Languages, CheckCircle, AlertTriangle } from 'lucide-react';

export default function InterviewDashboard({ onEnd, data }) {
    const webcamRef = useRef(null);
    const [confidenceScore, setConfidenceScore] = useState(50);
    const [emotionHistory, setEmotionHistory] = useState([50]);
    const [transcript, setTranscript] = useState("Listening...");
    const [isRecording, setIsRecording] = useState(true);
    const [question, setQuestion] = useState({ text: "Loading Prompt...", type: "System" });
    const [posture, setPosture] = useState("Good Posture");
    const [isTechMode, setIsTechMode] = useState(false);

    const language = data?.language || 'en';
    const skills = data?.resumeData?.skills || [];
    
    // Simulate Pulse and Emotion Graph
    useEffect(() => {
        const interval = setInterval(() => {
            setConfidenceScore(prev => {
                const newScore = Math.max(10, Math.min(100, prev + (Math.random() - 0.5) * 20));
                setEmotionHistory(hist => [...hist, newScore]);
                
                // Simulate posture tracking periodically
                if (Math.random() > 0.8) {
                    setPosture(Math.random() > 0.5 ? "Good Posture" : "Slouching Detected");
                } else if (Math.random() > 0.9) {
                    setPosture("Looking Down");
                }
                
                return newScore;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch / Generate Question
    useEffect(() => {
        const generatedText = skills.length > 0
            ? `Can you explain your experience with ${skills[Math.floor(Math.random() * skills.length)]} as mentioned in your resume?`
            : "Tell me something that makes you happy.";
            
        // Mock translation tag if not English
        const displayLanguage = language === 'ta' ? "[Tamil] உங்களைப் பற்றி கூறுங்கள்?" : language === 'hi' ? "[Hindi] अपने बारे में बताएं?" : generatedText;

        setQuestion({ text: displayLanguage, type: "Behavioral" });
    }, [skills, language]);

    // Web Speech API Integration
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setTranscript("Speech recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === 'ta' ? 'ta-IN' : language === 'hi' ? 'hi-IN' : 'en-US';

        recognition.onresult = (event) => {
            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                currentTranscript += event.results[i][0].transcript;
            }
            setTranscript(currentTranscript);
        };

        if (isRecording) {
            recognition.start();
        }

        return () => {
            recognition.stop();
        };
    }, [isRecording, language]);

    const highlightFillerWords = (text) => {
        const fillers = ['uh', 'um', 'like', 'actually', 'basically'];
        let words = text.split(' ');
        return words.map((word, i) => {
            const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
            if (fillers.includes(cleanWord)) {
                return <span key={i} className="text-red-500 font-bold shadow-[0_0_10px_#ef4444] px-1 bg-red-500/20 rounded mx-1">{word}</span>;
            }
            return <span key={i}>{word} </span>;
        });
    };

    const getOrbColor = (score) => {
        if (score < 40) return 'bg-red-500 shadow-[0_0_30px_#ef4444]';
        if (score < 70) return 'bg-yellow-500 shadow-[0_0_30px_#eab308]';
        return 'bg-green-500 shadow-[0_0_30px_#22c55e]';
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="w-full h-screen flex flex-col md:flex-row p-6 gap-6 relative z-10 box-border overflow-y-auto"
        >
            <AnimatePresence>
                {isTechMode && <TechnicalInterviewMode onClose={() => setIsTechMode(false)} />}
            </AnimatePresence>

            {/* LEFT SIDE: Webcam & Tracking */}
            <div className="flex-1 flex flex-col gap-4 min-h-[500px]">
                <div className="relative flex-1 glass-panel overflow-hidden flex items-center justify-center p-2 rounded-2xl border-white/10 group">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        className="w-full h-full object-cover rounded-xl"
                        mirrored={true}
                        videoConstraints={{ facingMode: "user" }}
                        onUserMediaError={() => setTranscript("Webcam permissions missing. Please allow camera.")}
                    />
                    
                    {/* Skeleton/Posture Overlay */}
                    <motion.div
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 pointer-events-none flex items-center justify-center mix-blend-screen"
                    >
                        {/* Mock skeleton graphic */}
                        <div className="w-[150px] h-[300px] border-2 border-neonPrimary/30 rounded-full flex flex-col items-center">
                            <div className="w-20 h-24 border-2 border-neonPrimary/50 rounded-full mt-4" />
                            <div className="w-1 h-32 bg-neonPrimary/50 mt-2" />
                        </div>
                    </motion.div>

                    {/* HUD Status Elements */}
                    <div className="absolute top-6 left-6 bg-black/50 px-3 py-1 rounded-full text-xs font-mono border border-neonPrimary text-neonPrimary tracking-widest backdrop-blur-sm">
                        TRACKING: ACTIVE
                    </div>
                    
                    <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest backdrop-blur-sm flex items-center gap-2 border ${
                        posture === "Good Posture" ? "bg-green-500/20 text-green-400 border-green-500" : "bg-red-500/20 text-red-500 border-red-500 animate-pulse"
                    }`}>
                        {posture === "Good Posture" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {posture.toUpperCase()}
                    </div>
                    
                    {/* Skills Detected Target Box */}
                    {skills.length > 0 && (
                        <div className="absolute bottom-6 left-6 flex gap-2 flex-wrap max-w-sm pointer-events-none">
                            {skills.map((skill, index) => (
                                <span key={index} className="text-[10px] px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white backdrop-blur-md">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Transcript Box */}
                <div className="h-40 glass-panel p-6 flex flex-col justify-center rounded-2xl border-white/10 relative overflow-hidden">
                    <h3 className="text-xs text-gray-400 mb-2 uppercase tracking-widest font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        Live Speech Transcript
                    </h3>
                    <p className="font-mono text-lg text-white/90 overflow-y-auto h-full pr-2">
                        {highlightFillerWords(transcript)}
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE: AI Feedback & Questions */}
            <div className="w-full md:w-[450px] flex flex-col gap-6">
                
                {/* Realtime Emotion Graph */}
                <div className="glass-panel p-6 flex flex-col rounded-2xl border-white/10 h-48">
                    <h3 className="text-gray-400 tracking-widest text-xs uppercase font-semibold mb-2 flex justify-between">
                        <span>Emotion Timeline</span>
                        <span className="text-neonPrimary">{Math.round(confidenceScore)}%</span>
                    </h3>
                    <div className="flex-1 w-full bg-black/20 rounded-xl overflow-hidden inset-shadow-inner border border-white/5 relative">
                        <EmotionChart dataPoints={emotionHistory} />
                    </div>
                </div>

                {/* Realtime Confidence Orb Panel */}
                <div className="glass-panel p-6 flex flex-col items-center justify-center gap-6 rounded-2xl border-white/10 flex-1">
                    <h3 className="text-gray-400 tracking-widest text-xs uppercase font-semibold text-center w-full">Current State</h3>
                    <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        className={`w-32 h-32 rounded-full ${getOrbColor(confidenceScore)} backdrop-blur-3xl border border-white/20`}
                    />
                    <div className="text-xl font-mono tracking-tighter text-white/70">
                        {confidenceScore > 70 ? 'Confident' : confidenceScore > 40 ? 'Neutral' : 'Nervous'}
                    </div>
                </div>

                {/* Floating Question Card */}
                <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    className="glass-panel neon-border-primary p-8 flex flex-col justify-center rounded-2xl border-white/10 relative overflow-hidden flex-1"
                >
                    <div className="flex items-center gap-2 mb-4 relative z-10 w-full justify-between">
                        <span className="px-2 py-1 bg-[rgba(var(--neon-primary),0.2)] text-[rgb(var(--neon-primary))] rounded text-xs font-bold uppercase tracking-wider">
                            {question.type} Prompt
                        </span>
                        <Languages className="w-4 h-4 text-white/50" />
                    </div>
                    <p className="text-2xl leading-relaxed text-white/90 font-medium relative z-10">
                        "{question.text}"
                    </p>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[rgba(var(--neon-primary),0.1)] rounded-full blur-3xl z-0 pointer-events-none"></div>
                </motion.div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsTechMode(true)}
                        className="flex-1 glass-panel p-4 hover:bg-white/5 transition-all rounded-2xl border border-white/20 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-sm"
                    >
                        <Code className="w-5 h-5" /> Launch Editor
                    </button>
                    
                    <button
                        onClick={() => {
                            setIsRecording(false);
                            const clarity = Math.max(0, 100 - (transcript.match(/(uh|um|like|actually|basically)/gi)?.length || 0) * 5);
                            
                            // Mock Posture score
                            const postureScore = Math.floor(Math.random() * 20) + 80;
                            
                            onEnd({
                                confidence: Math.round(confidenceScore),
                                clarity: clarity,
                                posture: postureScore,
                                skills: skills,
                            });
                        }}
                        className="glass-panel p-4 bg-red-500/10 hover:bg-red-500/30 text-red-400 transition-all rounded-2xl border border-red-500/50 uppercase tracking-widest font-bold font-sans cursor-pointer active:scale-95 text-sm flex-1 whitespace-nowrap"
                    >
                        End Session
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
