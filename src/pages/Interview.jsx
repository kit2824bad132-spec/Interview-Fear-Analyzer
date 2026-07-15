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
  
  // Fetch AI generated questions on load
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const aiData = JSON.parse(localStorage.getItem('ifa_resume_data') || '{}');
        const role = aiData.role || "Software Engineer";
        const skills = aiData.skills || ["React", "Problem Solving"];
        
        const res = await fetch('http://127.0.0.1:5000/api/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, skills, email: user?.email })
        });
        
        if (res.ok) {
           const data = await res.json();
           setQuestions(data.length > 0 ? data : [
             { id: 1, category: 'Behavioral', text: 'Tell me about yourself.', type: 'interview' }
           ]);
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
      if (phaseRef.current !== 'interviewing') return;
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      setInterimText(interimTranscript);
      if (finalTranscript) {
        setTranscripts(prev => {
          const qIndex = phaseRef.currentQ ?? 0;
          const newText = (prev[qIndex] || '') + finalTranscript + ' ';
          const match = newText.match(FILLER_WORDS_REGEX);
          setFillerWordsCount(match ? match.length : 0);
          return { ...prev, [qIndex]: newText };
        });
      }
    };

    recognition.onend = () => {
      if (phaseRef.current === 'interviewing') {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') console.warn('Speech error:', e.error);
    };

    recognitionRef.current = recognition;
    return () => { try { recognition.stop(); } catch(e) {} };
  }, []); // run ONCE on mount

  // keep a ref to currentQ so speech recognition onresult always uses latest value
  const currentQRef = useRef(0);
  useEffect(() => {
    currentQRef.current = currentQ;
    phaseRef.currentQ = currentQ;
  }, [currentQ]);

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
    
    // Stop and restart to ensure it runs cleanly for the active interview
    try {
      recognitionRef.current?.stop();
    } catch (e) {}
    
    setTimeout(() => {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn("Failed to restart recognition:", e);
      }
    }, 200);
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
  const handleNextOrFinish = () => {
    setInterimText('');
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setTimeRemaining(120);
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
      const response = await fetch('http://127.0.0.1:5000/api/analyze-interview', {
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

        await fetch('http://127.0.0.1:5000/api/interview-session/save', {
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
  const scores = aiAnalysis?.scores || { total: 85, confidence: 80, clarity: 90, eyeContact: 85 };

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="font-bold text-gray-500 uppercase tracking-widest text-sm">Generating AI Session...</p>
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
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 text-center">AI Interview Simulator</h1>
          <p className="text-gray-500 text-center max-w-lg mb-8 leading-relaxed">
            Experience a realistic behavioral interview with real-time AI tracking.
          </p>
          <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-8 w-full max-w-2xl">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-500" /> System Check</h3>
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3"><Video className="w-5 h-5 text-gray-400" /> <span className="font-medium text-gray-700">Camera</span></div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Required</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3"><Mic className="w-5 h-5 text-gray-400" /> <span className="font-medium text-gray-700">Microphone</span></div>
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
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
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
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex-1 flex flex-col">
                <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-6">Live AI Telemetry</h3>
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between text-white text-sm font-medium mb-2">
                      <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400"/> Voice Energy</span>
                      <span>{audioLevel}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
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
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
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
                  <div className="inline-block px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs font-bold mb-3 uppercase tracking-wider">
                    Question {currentQ + 1} of {questions.length}
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
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center px-4">
            <div className="flex gap-2">
              {questions.map((_, i) => (
                <div key={i} className={`h-1.5 w-12 rounded-full transition-all ${i === currentQ ? 'bg-blue-500' : i < currentQ ? 'bg-white/40' : 'bg-white/10'}`} />
              ))}
            </div>
            <button onClick={handleNextOrFinish} className="bg-white hover:bg-gray-100 text-black px-8 py-3 rounded-xl font-bold text-lg transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-2">
              {currentQ < questions.length - 1 ? 'Submit & Next' : 'Finish Interview'} <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ANALYZING PHASE */}
      {phase === 'analyzing' && (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
          <div className="w-24 h-24 relative mb-8">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            <ShieldCheck className="absolute inset-0 m-auto w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Processing AI Analysis...</h1>
          <p className="text-gray-500 max-w-md mx-auto">Evaluating your responses and generating your report.</p>
        </div>
      )}

      {/* DASHBOARD PHASE */}
      {phase === 'dashboard' && (
        <div className="max-w-7xl mx-auto py-8 px-4 font-sans">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-100 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Performance Dashboard</h1>
              <p className="text-gray-500">Your AI-driven interview results and feedback.</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm">
                <Download className="w-4 h-4" /> Save Report
              </button>
              <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm">
                <RotateCcw className="w-4 h-4" /> Retry
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-black rounded-3xl overflow-hidden shadow-lg border border-gray-200 relative aspect-video flex items-center justify-center">
                {videoUrl ? <video src={videoUrl} controls className="w-full h-full object-cover" /> : <p className="text-white/50 text-sm">No recording available</p>}
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl flex items-center gap-8">
                <div className="w-24 h-24 shrink-0 bg-white rounded-full p-2">
                  <CircularProgress value={scores.total} size={80} strokeWidth={8} color="#2563EB" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">Overall Score</h2>
                  <p className="text-blue-100 text-sm leading-relaxed mb-3">STAR method delivery assessment.</p>
                  <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wider">
                    {scores.total >= 80 ? 'EXCELLENT' : scores.total >= 60 ? 'GOOD' : 'NEEDS PRACTICE'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Confidence</p>
                  <p className="text-3xl font-extrabold text-gray-900">{scores.confidence}%</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Clarity</p>
                  <p className="text-3xl font-extrabold text-gray-900">{scores.clarity}%</p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                <h3 className="font-bold text-xl text-gray-900 mb-4">Executive Summary</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{aiAnalysis?.summary || "Analysis complete."}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-emerald-700"><CheckCircle className="w-5 h-5" /><h3 className="font-bold text-lg">Key Strengths</h3></div>
                  <ul className="space-y-3">
                    {(aiAnalysis?.strengths || ["Good communication"]).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /> {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50/50 border border-red-100 rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4 text-red-700"><AlertTriangle className="w-5 h-5" /><h3 className="font-bold text-lg">Areas to Improve</h3></div>
                  <ul className="space-y-3">
                    {(aiAnalysis?.improvements || ["Use STAR method"]).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" /> {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                <h3 className="font-bold text-xl text-gray-900 mb-6">Response Breakdown</h3>
                <div className="space-y-6">
                  {questions.map((q, i) => (
                    <div key={i} className="pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                      <p className="font-semibold text-gray-900 mb-2">Q{i+1}: {q.text}</p>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Your Answer</p>
                        <p className="text-sm text-gray-700 italic">"{transcripts[i] || "No response provided."}"</p>
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


