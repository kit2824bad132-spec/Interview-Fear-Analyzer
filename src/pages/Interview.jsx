import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, AlertTriangle, ChevronRight, Play, Square, 
  Video, Activity, Clock, CheckCircle, Download, RotateCcw, 
  MessageSquare, Eye, ShieldCheck, Loader2
} from 'lucide-react';
import Webcam from 'react-webcam';
import { useAuth } from '../context/AuthContext';

const CircularProgress = ({ value, size = 96, strokeWidth = 8, color = "#2563EB" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - ((value || 0) / 100) * circumference;
  
  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#EFF6FF" strokeWidth={strokeWidth} fill="none" />
        <motion.circle 
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" 
          strokeDasharray={circumference} strokeLinecap="round" 
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-[#1E3A8A]">{value || 0}%</span>
      </div>
    </div>
  );
};

const CATEGORY_COLORS = {
  Behavioral: 'bg-blue-100 text-blue-700',
  Situational: 'bg-purple-100 text-purple-700',
  Technical: 'bg-emerald-100 text-emerald-700',
  HR: 'bg-amber-100 text-amber-700',
  Coding: 'bg-violet-100 text-violet-700',
  'Project-Based': 'bg-cyan-100 text-cyan-700',
  'Follow-up': 'bg-pink-100 text-pink-700',
};

const FILLER_WORDS_REGEX = /\b(um|uh|like|literally|basically|you know)\b/gi;

const Interview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Phase Management: 'setup' | 'countdown' | 'interviewing' | 'analyzing' | 'dashboard'
  const [phase, setPhase] = useState('setup');
  const phaseRef = useRef('setup');
  const [countdown, setCountdown] = useState(3);
  
  // Update phaseRef whenever phase changes
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [transcripts, setTranscripts] = useState({});
  const [interimText, setInterimText] = useState("");
  
  // Metrics
  const [audioLevel, setAudioLevel] = useState(0);
  const [fillerWordsCount, setFillerWordsCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes per question
  
  // Recording & API
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const recognitionRef = useRef(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const showFeedbackRef = useRef(false);
  
  useEffect(() => {
    showFeedbackRef.current = showFeedback;
  }, [showFeedback]);
  
  const currentQRef = useRef(0);
  const transcriptsRef = useRef({});
  const lastSpeechTimeRef = useRef(Date.now());
  const handleNextOrFinishRef = useRef(null);
  
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Fetch AI generated questions on load
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const aiData = JSON.parse(localStorage.getItem('ifa_resume_data') || '{}');
        const role = aiData.role || "Software Engineer";
        const skills = aiData.skills || ["React", "Problem Solving"];
        
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/generate-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, skills, email: user?.email })
        });
        
        if (res.ok) {
           const data = await res.json();
           setQuestions(data.length > 0 ? data : [
             { id: 1, category: 'Behavioral', text: 'Tell me about yourself.', type: 'interview' }
           ]);
        } else {
           throw new Error("Failed to generate questions");
        }
      } catch (err) {
        console.error("AI Error:", err);
        setQuestions([
          { id: 1, category: 'Behavioral', text: 'Tell me about yourself and your professional background.', type: 'interview' },
          { id: 2, category: 'Technical', text: 'Describe a complex technical challenge you recently solved.', type: 'interview' }
        ]);
      }
    }
    fetchQuestions();
  }, [user]);

  // Speech Recognition - single persistent instance, created once on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      if (phaseRef.current !== 'interviewing' || showFeedbackRef.current) return;
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      setInterimText(interimTranscript);
      
      // Update speech time to prevent silence timeout
      if (lastSpeechTimeRef.current) {
        lastSpeechTimeRef.current = Date.now();
      }

      if (finalTranscript) {
        setTranscripts(prev => {
          const qIndex = currentQRef.current ?? 0;
          const newText = (prev[qIndex] || '') + finalTranscript + ' ';
          const match = newText.match(FILLER_WORDS_REGEX);
          setFillerWordsCount(match ? match.length : 0);
          return { ...prev, [qIndex]: newText };
        });
      }
    };

    recognition.onend = () => {
      if (phaseRef.current === 'interviewing' || phaseRef.current === 'countdown') {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') console.warn('Speech error:', e.error);
    };

    recognitionRef.current = recognition;
    return () => { try { recognition.stop(); } catch(e) {} };
  }, []); // run ONCE on mount



  useEffect(() => {
    currentQRef.current = currentQ;
    phaseRef.currentQ = currentQ;
    lastSpeechTimeRef.current = Date.now(); // Reset silence timer on question change
  }, [currentQ]);

  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);

  const audioContextRef = useRef(null);

  // Audio Visualizer - reuse the webcam stream's audio track (no second getUserMedia)
  const startAudioVisualizer = useCallback((stream) => {
    try {
      let audioContext = audioContextRef.current;
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const scriptProcessor = audioContext.createScriptProcessor(256, 1, 1);
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      microphone.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      scriptProcessor.onaudioprocess = () => {
        if (phaseRef.current !== 'interviewing') return;
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        let values = 0;
        for (let i = 0; i < array.length; i++) values += array[i];
        setAudioLevel(Math.min(100, Math.round((values / array.length) * 2)));
      };
    } catch (err) { console.warn('Visualizer error:', err); }
  }, []);

  // Start Session handler
  const handleStartSession = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (e) {
      alert('Camera and Microphone permissions are required.');
      return;
    }
    setCameraReady(true);

    // Initialize AudioContext in user gesture
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { console.warn("Failed to create AudioContext:", e); }

    // Start Speech Recognition in user gesture to satisfy browser security
    try {
      recognitionRef.current?.start();
    } catch (e) { console.warn("Failed to start SpeechRecognition:", e); }

    try {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch (e) {}
    setPhase('countdown');
    let timer = 3;
    const interval = setInterval(() => {
      timer -= 1;
      setCountdown(timer);
      if (timer === 0) { clearInterval(interval); startInterview(); }
    }, 1000);
  };

  // Begin Interview Phase
  const startInterview = useCallback(() => {
    setPhase('interviewing');
    setTimeRemaining(120);
    lastSpeechTimeRef.current = Date.now();
    
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.warn("Recognition already started or failed:", e);
    }
  }, []);

  const handleUserMedia = useCallback(() => {
    const stream = webcamRef.current?.stream;
    if (!stream) return;
    // Start audio visualizer using the webcam's stream (no second getUserMedia needed)
    startAudioVisualizer(stream);
    // Start MediaRecorder if interviewing
    if (phaseRef.current === 'interviewing' && !mediaRecorderRef.current) {
      try {
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current.addEventListener('dataavailable', handleDataAvailable);
        mediaRecorderRef.current.start(1000);
      } catch (e) { console.error('MediaRecorder failed:', e); }
    }
  }, [startAudioVisualizer]);

  // Trigger recording start if phase changes while webcam is already mounted
  useEffect(() => {
    if (phase === 'interviewing') {
       handleUserMedia();
    }
  }, [phase, handleUserMedia]);

  const handleDataAvailable = useCallback(({ data }) => {
    if (data.size > 0) setRecordedChunks((prev) => prev.concat(data));
  }, []);

  // Timer Countdown Logic
  useEffect(() => {
    if (phase !== 'interviewing') return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Next Question or Finish
  const handleNextOrFinish = async () => {
    setInterimText('');
    const answer = transcriptsRef.current[currentQRef.current] || "No response provided.";
    const question = questions[currentQRef.current]?.text;
    
    try { recognitionRef.current?.stop(); } catch (e) {}

    setIsEvaluating(true);
    setShowFeedback(true);

    try {
        const aiData = JSON.parse(localStorage.getItem('ifa_resume_data') || '{}');
        const role = aiData.role || 'Software Engineer';
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/evaluate-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, answer, role })
        });
        if (response.ok) {
            const data = await response.json();
            setCurrentFeedback(data);
            if (data.followUpQuestion) {
                setQuestions(prev => {
                    const newQs = [...prev];
                    newQs.splice(currentQRef.current + 1, 0, { id: Date.now(), category: 'Follow-up', text: data.followUpQuestion });
                    return newQs;
                });
            }
        } else {
            setCurrentFeedback({ score: 0, improvement: "Could not evaluate answer." });
        }
    } catch (e) {
        setCurrentFeedback({ score: 0, improvement: "Could not evaluate answer." });
    }
    setIsEvaluating(false);

    // Auto-proceed after showing feedback for 4 seconds
    setTimeout(() => {
        proceedToNextQuestion();
    }, 4000);
  };

  useEffect(() => {
    handleNextOrFinishRef.current = handleNextOrFinish;
  }, [handleNextOrFinish]);

  // Silence Detection Logic
  useEffect(() => {
    if (phase !== 'interviewing' || showFeedback) return;
    
    const interval = setInterval(() => {
      const timeSinceLastSpeech = Date.now() - lastSpeechTimeRef.current;
      const currentAns = transcriptsRef.current[currentQRef.current];
      
      // If we have an answer (>15 chars), and it's been > 4.5 seconds of silence
      if (timeSinceLastSpeech > 4500 && currentAns && currentAns.trim().length > 15) {
        if (handleNextOrFinishRef.current) {
          handleNextOrFinishRef.current();
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [phase, showFeedback]);

  const proceedToNextQuestion = () => {
      setShowFeedback(false);
      setCurrentFeedback(null);
      if (currentQRef.current < questions.length - 1) {
          setCurrentQ(prev => prev + 1);
          setTimeRemaining(120);
          lastSpeechTimeRef.current = Date.now();
          try { recognitionRef.current?.start(); } catch (e) {}
      } else {
          finishInterview();
      }
  };

  // Finish and Analyze
  const finishInterview = async () => {
    // Stop recording and mic
    try { recognitionRef.current?.stop(); } catch (e) {}
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    // Exit fullscreen
    if (document.fullscreenElement) document.exitFullscreen();
    setPhase('analyzing');

    // Convert video blob
    let localVideoUrl = null;
    let videoBlob = null;
    const chunks = recordedChunks;
    if (chunks.length > 0) {
      videoBlob = new Blob(chunks, { type: 'video/webm' });
      localVideoUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(localVideoUrl);
    }

    // Call Backend AI Analysis
    let analysis = null;
    try {
      const aiData = JSON.parse(localStorage.getItem('ifa_resume_data') || '{}');
      const role = aiData.role || 'Software Engineer';
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/analyze-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          questions: questions.map(q => q.text),
          answers: questions.map((_, i) => transcripts[i] || 'No response recorded.')
        })
      });
      analysis = await response.json();
      setAiAnalysis(analysis);

      // Save full session to backend using multipart FormData
      try {
        const formData = new FormData();
        formData.append('userEmail', user?.email || 'anonymous');
        formData.append('role', role);
        formData.append('questions', JSON.stringify(questions.map(q => q.text)));
        formData.append('answers', JSON.stringify(questions.map((_, i) => transcripts[i] || 'No response recorded.')));
        formData.append('fillerWordsCount', fillerWordsCount);
        formData.append('analysis', JSON.stringify(analysis));
        if (videoBlob) {
          formData.append('video', videoBlob, 'video.webm');
        }

        await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/interview-session/save`, {
          method: 'POST',
          body: formData
        });
        console.log('Session saved to backend ✅');
      } catch (saveErr) {
        console.warn('Could not save session to backend:', saveErr);
      }
    } catch (err) {
      console.error(err);
      alert('Analysis failed. Showing partial dashboard.');
    }
    setPhase('dashboard');
  };


  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- RENDER ---
  const isLive = phase === 'countdown' || phase === 'interviewing';
  const scores = aiAnalysis?.scores || { overall: 0, technical: 0, behavioral: 0, hr: 0, communication: 0, confidence: 0 };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-sm">Generating AI Session...</p>
      </div>
    );
  }

  return (
    <>
      {/* PERSISTENT HIDDEN WEBCAM - never unmounts once camera is ready */}
      {cameraReady && phase !== 'interviewing' && (
        <Webcam audio={true} ref={webcamRef} onUserMedia={handleUserMedia} className="fixed w-1 h-1 opacity-0 pointer-events-none" mirrored={true} />
      )}

      {/* SETUP PHASE */}
      {phase === 'setup' && (
        <div className="max-w-4xl mx-auto py-12 px-4 flex flex-col items-center">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Video className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-4 text-center">AI Interview Simulator</h1>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-lg mb-8 leading-relaxed">
            Experience a realistic behavioral interview with real-time AI tracking.
          </p>
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-3xl p-8 w-full max-w-2xl">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-500" /> System Check</h3>
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="flex items-center gap-3"><Video className="w-5 h-5 text-gray-400" /> <span className="font-medium text-gray-700 dark:text-gray-300">Camera</span></div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Required</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className="flex items-center gap-3"><Mic className="w-5 h-5 text-gray-400" /> <span className="font-medium text-gray-700 dark:text-gray-300">Microphone</span></div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Required</span>
              </div>
            </div>
            <button onClick={handleStartSession} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
              Start Session Now <ChevronRight className="w-5 h-5" />
            </button>
            <p className="text-xs text-center text-gray-400 mt-4">Video saved locally in your browser only.</p>
          </div>
        </div>
      )}

      {/* COUNTDOWN PHASE */}
      {phase === 'countdown' && (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center text-white">
          <motion.h1 key={countdown} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-[150px] font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-500">
            {countdown}
          </motion.h1>
          <p className="text-xl font-medium mt-4 text-gray-400 tracking-widest uppercase">Get Ready</p>
        </div>
      )}

      {/* INTERVIEWING PHASE */}
      {phase === 'interviewing' && (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col p-6 overflow-hidden font-sans">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_red]"></div>
              <span className="text-white text-sm font-semibold tracking-wide">Recording</span>
            </div>
            <div className="flex items-center gap-2 text-white bg-black/40 px-4 py-2 rounded-full font-mono text-lg font-bold border border-white/5">
              <Clock className="w-5 h-5 text-gray-400" /> {formatTime(timeRemaining)}
            </div>
            <button onClick={finishInterview} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2 rounded-full text-sm font-bold transition-colors border border-red-500/30">
              End Early
            </button>
          </div>

          <div className="flex-1 flex gap-6 min-h-0 relative">
            <div className="w-72 flex flex-col gap-4">
              <div className="bg-white dark:bg-gray-800/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex-1 flex flex-col">
                <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-6">Live AI Telemetry</h3>
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between text-white text-sm font-medium mb-2">
                      <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400"/> Voice Energy</span>
                      <span>{audioLevel}%</span>
                    </div>
                    <div className="h-2 w-full bg-white dark:bg-gray-800/10 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-blue-500 rounded-full" animate={{ width: `${audioLevel}%` }} transition={{ ease: "linear", duration: 0.1 }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-white text-sm font-medium mb-2">
                      <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-amber-400"/> Filler Words</span>
                      <span className={fillerWordsCount > 5 ? 'text-red-400' : 'text-amber-400'}>{fillerWordsCount}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-white text-sm font-medium mb-2">
                      <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-emerald-400"/> Eye Contact</span>
                      <span className="text-emerald-400">Good</span>
                    </div>
                    <div className="h-2 w-full bg-white dark:bg-gray-800/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full w-[85%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* WEBCAM - visible during interview */}
            <div className="flex-1 flex flex-col relative rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl">
              <Webcam audio={true} ref={webcamRef} onUserMedia={handleUserMedia} className="absolute inset-0 w-full h-full object-cover" mirrored={true} />
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-3/4 max-w-2xl">
                <motion.div key={currentQ} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  className="bg-black/60 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="inline-block px-3 py-1 bg-white dark:bg-gray-800/10 text-white/80 rounded-full text-xs font-bold uppercase tracking-wider">
                      Question {currentQ + 1} of {questions.length}
                    </span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${CATEGORY_COLORS[questions[currentQ]?.category] || 'bg-white dark:bg-gray-800/10 text-white/80'}`}>
                      {questions[currentQ]?.category || 'General'}
                    </span>
                  </div>
                  <h2 className="text-white text-xl md:text-2xl font-medium leading-relaxed">"{questions[currentQ]?.text}"</h2>
                </motion.div>
              </div>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 max-w-3xl">
                <div className="bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-h-[80px] flex items-center justify-center">
                  <p className="text-white text-lg text-center font-medium leading-relaxed">
                    {transcripts[currentQ] || <span className="text-white/40 italic">Start speaking to answer...</span>}
                    <span className="text-white/60 ml-2 animate-pulse">{interimText}</span>
                  </p>
                </div>
              </div>

              {/* Feedback Overlay */}
              <AnimatePresence>
                {showFeedback && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6">
                    {isEvaluating ? (
                      <div className="flex flex-col items-center text-white">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                        <h2 className="text-xl font-bold">Evaluating Answer...</h2>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-gray-800/10 border border-white/20 p-8 rounded-3xl max-w-2xl w-full text-white shadow-2xl">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                          <CheckCircle className="text-emerald-400 w-6 h-6" /> Instant Feedback
                        </h2>
                        <div className="flex justify-between items-center bg-black/30 p-4 rounded-xl mb-4">
                           <span className="font-medium text-gray-300">Score</span>
                           <span className={`text-2xl font-bold ${currentFeedback?.score >= 7 ? 'text-emerald-400' : 'text-amber-400'}`}>{currentFeedback?.score}/10</span>
                        </div>
                        <div className="space-y-4">
                           <div>
                             <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">Strengths / Accuracy</p>
                             <p className="text-sm text-gray-200">{currentFeedback?.technicalAccuracy}</p>
                           </div>
                           <div>
                             <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">Improvement</p>
                             <p className="text-sm text-gray-200">{currentFeedback?.improvement}</p>
                           </div>
                           {currentFeedback?.followUpQuestion && (
                             <div className="bg-blue-500/20 border border-blue-500/30 p-4 rounded-xl mt-4">
                               <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Follow-up Generated</p>
                               <p className="text-sm font-medium">{currentFeedback.followUpQuestion}</p>
                             </div>
                           )}
                        </div>
                        <button onClick={proceedToNextQuestion} className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
                          Continue Interview
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

          <div className="mt-6 flex justify-between items-center px-4">
            <div className="flex gap-2">
              {questions.map((_, i) => (
                <div key={i} className={`h-1.5 w-12 rounded-full transition-all ${i === currentQ ? 'bg-blue-500' : i < currentQ ? 'bg-white dark:bg-gray-800/40' : 'bg-white dark:bg-gray-800/10'}`} />
              ))}
            </div>
            <button onClick={handleNextOrFinish} className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700 text-black dark:text-white px-8 py-3 rounded-xl font-bold text-lg transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-2">
              {currentQ < questions.length - 1 ? 'Submit & Next' : 'Finish Interview'} <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ANALYZING PHASE */}
      {phase === 'analyzing' && (
        <div className="flex flex-col items-center justify-center min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-900 text-center px-4">
          <div className="w-24 h-24 relative mb-8">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            <ShieldCheck className="absolute inset-0 m-auto w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-3">Processing AI Analysis...</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">Evaluating your responses and generating your report.</p>
        </div>
      )}

      {/* DASHBOARD PHASE */}
      {phase === 'dashboard' && (
        <div className="max-w-7xl mx-auto py-8 px-4 font-sans min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">🎯 Final Interview Report</h1>
              <p className="text-gray-500 dark:text-gray-400">Resume-based AI interview evaluation — personalized to your profile.</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 shadow-sm">
                <Download className="w-4 h-4" /> Save Report
              </button>
              <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">
                <RotateCcw className="w-4 h-4" /> Retry Interview
              </button>
            </div>
          </div>

          {/* Score Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { label: 'Overall', value: scores.overall || scores.total || 0, color: 'from-blue-500 to-indigo-600' },
              { label: 'Technical', value: scores.technical || 0, color: 'from-emerald-500 to-teal-600' },
              { label: 'Behavioral', value: scores.behavioral || 0, color: 'from-purple-500 to-violet-600' },
              { label: 'HR', value: scores.hr || 0, color: 'from-amber-500 to-orange-600' },
              { label: 'Communication', value: scores.communication || scores.clarity || 0, color: 'from-cyan-500 to-blue-600' },
              { label: 'Confidence', value: scores.confidence || 0, color: 'from-pink-500 to-rose-600' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm text-center hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
                  <span className="text-white font-bold text-lg">{s.value}</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">{s.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-black rounded-3xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 relative aspect-video flex items-center justify-center">
                {videoUrl ? <video src={videoUrl} controls className="w-full h-full object-cover" /> : <p className="text-white/50 text-sm">No recording available</p>}
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl flex items-center gap-8">
                <div className="w-24 h-24 shrink-0 bg-white dark:bg-gray-800 rounded-full p-2">
                  <CircularProgress value={scores.overall || scores.total || 0} size={80} strokeWidth={8} color="#2563EB" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">Overall Score</h2>
                  <p className="text-blue-100 text-sm leading-relaxed mb-3">AI-evaluated performance across all categories.</p>
                  <div className="inline-block px-3 py-1 bg-white dark:bg-gray-800/20 rounded-full text-xs font-bold tracking-wider">
                    {(scores.overall || scores.total || 0) >= 80 ? 'EXCELLENT' : (scores.overall || scores.total || 0) >= 60 ? 'GOOD' : 'NEEDS PRACTICE'}
                  </div>
                </div>
              </div>

              {/* Recommended Learning */}
              {aiAnalysis?.recommendedLearning && aiAnalysis.recommendedLearning.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-blue-700">
                    <Activity className="w-5 h-5" />
                    <h3 className="font-bold text-lg">Recommended Learning</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysis.recommendedLearning.map((topic, i) => (
                      <span key={i} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold">{topic}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-8 shadow-sm">
                <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-4">Executive Summary</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{aiAnalysis?.summary || "Analysis complete."}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-emerald-700"><CheckCircle className="w-5 h-5" /><h3 className="font-bold text-lg">Strong Areas</h3></div>
                  <ul className="space-y-3">
                    {(aiAnalysis?.strengths || []).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-amber-700"><AlertTriangle className="w-5 h-5" /><h3 className="font-bold text-lg">Weak Areas</h3></div>
                  <ul className="space-y-3">
                    {(aiAnalysis?.weaknesses || []).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" /> {s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Improvement Suggestions */}
              <div className="bg-purple-50/50 border border-purple-100 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4 text-purple-700"><Eye className="w-5 h-5" /><h3 className="font-bold text-lg">Improvement Suggestions</h3></div>
                <ul className="space-y-3">
                  {(aiAnalysis?.improvements || []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" /> {s}</li>
                  ))}
                </ul>
              </div>

              {/* Response Breakdown */}
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-8 shadow-sm">
                <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-6">Response Breakdown ({questions.length} Questions)</h3>
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                  {questions.map((q, i) => (
                    <div key={i} className="pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          q.category === 'Technical' ? 'bg-emerald-100 text-emerald-700' :
                          q.category === 'HR' ? 'bg-amber-100 text-amber-700' :
                          q.category === 'Behavioral' ? 'bg-blue-100 text-blue-700' :
                          q.category === 'Coding' ? 'bg-purple-100 text-purple-700' :
                          q.category === 'Follow-up' ? 'bg-pink-100 text-pink-700' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>{q.category || 'General'}</span>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Q{i+1}: {q.text}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Your Answer</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{transcripts[i] || "No response provided."}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Interview;


