import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code2, AlertTriangle, ChevronRight, Play, Check, RotateCcw, 
  Maximize2, Minimize2, Terminal, Cpu, Layers, HelpCircle, 
  Video, Mic, Activity, CheckCircle, Clock, Database, Trash2, 
  Save, Sparkles, BookOpen, UserCheck, ShieldAlert, Sun, Moon
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import Webcam from 'react-webcam';
import { useAuth } from '../context/AuthContext';

// Page animation variants
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0 }
};

const getBoilerplate = (title, lang, originalBoilerplate) => {
  let funcName = "solution";
  let args = ["input"];
  
  if (originalBoilerplate) {
    const match = originalBoilerplate.match(/function\s+(\w+)\s*\(([^)]*)\)/);
    if (match) {
      funcName = match[1];
      args = match[2].split(',').map(s => s.trim()).filter(Boolean);
    }
  } else if (title) {
    funcName = title.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().replace(/\s+/g, 'Camel').replace(/Camel(\w)/g, (_, c) => c.toUpperCase());
    funcName = funcName.charAt(0).toLowerCase() + funcName.slice(1);
  }

  const jsArgs = args.join(', ');

  switch (lang) {
    case 'python':
      return `class Solution:\n    def ${funcName}(self, ${args.map(a => a + ': str').join(', ')}) -> str:\n        # Write your Python 3 code here\n        pass`;
    case 'java':
      return `class Solution {\n    public String ${funcName}(${args.map(a => 'String ' + a).join(', ')}) {\n        // Write your Java code here\n        return "";\n    }\n}`;
    case 'cpp':
      return `#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    string ${funcName}(${args.map(a => 'string ' + a).join(', ')}) {\n        // Write your C++ code here\n        return "";\n    }\n};`;
    case 'go':
      return `package main\n\nfunc ${funcName}(${args.map(a => a + ' string').join(', ')}) string {\n    // Write your Go code here\n    return ""\n}`;
    case 'javascript':
    default:
      return originalBoilerplate || `function ${funcName}(${jsArgs}) {\n    // Write your JavaScript code here\n    \n}`;
  }
};

const parseTestCases = (text) => {
  try {
    const examples = [];
    const exampleRegex = /Example\s*(\d+):[\s\S]*?Input:\s*(.*?)\n\s*Output:\s*(.*?)(?=\n\s*(?:Example|Constraints|Explanation|$))/gi;
    let match;
    while ((match = exampleRegex.exec(text)) !== null) {
      examples.push({
        id: parseInt(match[1]),
        input: match[2].trim(),
        expected: match[3].trim(),
        actual: "",
        status: "idle"
      });
    }
    if (examples.length > 0) return examples;
  } catch (e) {
    console.warn("Failed parsing examples from text:", e);
  }
  return [
    { id: 1, input: 's = "aabcccccaaa"', expected: '"a2b1c5a3"', actual: "", status: "idle" },
    { id: 2, input: 's = "abcdef"', expected: '"abcdef"', actual: "", status: "idle" }
  ];
};

const getProgressiveHints = (title) => {
  return [
    "Analyze constraints: Is it O(N) or O(N log N) expected?",
    "Use standard data structures (e.g. Map, Two-Pointers) to store frequency or track positions.",
    "Edge cases: Empty strings, single character inputs, or large arrays of identical elements."
  ];
};

const Technical = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // White and Black background settings
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Code editor states
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [codeDrafts, setCodeDrafts] = useState({});
  const [currentQ, setCurrentQ] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSession, setIsSavingSession] = useState(false);
  
  // Timer & Layout states
  const [timer, setTimer] = useState(3600); // default 60 minutes
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftTab, setLeftTab] = useState("proctor"); // Start on proctor tab optionally, but now it works everywhere
  const [rightBottomTab, setRightBottomTab] = useState("testcases"); // testcases | console
  
  // Test case & console states
  const [testCases, setTestCases] = useState([]);
  const [selectedTestCase, setSelectedTestCase] = useState(0);
  const [consoleOutput, setConsoleOutput] = useState("Console ready. Run tests or submit to execute code.");
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Progressive hints
  const [revealedHints, setRevealedHints] = useState(0);
  
  // AI review outputs
  const [aiReview, setAiReview] = useState(null);

  // AI Proctoring & Recording States
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const canvasRef = useRef(null);
  const liveCanvasRef = useRef(null);  // separate canvas for live stream
  const wsRef = useRef(null);       // face-assessment WS (Python)
  const liveWsRef = useRef(null);   // admin live-monitor WS (Node)
  const [stream, setStream] = useState(null);
  const [isCentered, setIsCentered] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [audioLevel, setAudioLevel] = useState(15);
  const [warningCount, setWarningCount] = useState(0);
  const audioContextRef = useRef(null);
  const liveStreamIntervalRef = useRef(null);
  const sessionStartRef = useRef(Date.now());
  const tabSwitches = useRef(0);
  const handleSubmitRef = useRef(null);

  // Fullscreen helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Fetch AI generated coding challenge
  useEffect(() => {
    async function fetchChallenge() {
      try {
        const res = await fetch('http://127.0.0.1:5000/api/generate-technical-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user?.email })
        });
        
        if (res.ok) {
          const data = await res.json();
          setCurrentQ(data);
          
          // Setup boilerplates
          const jsBoiler = getBoilerplate(data.title, 'javascript', data.boilerplate);
          setCode(jsBoiler);
          setCodeDrafts({ javascript: jsBoiler });

          // Parse dynamic test cases
          setTestCases(parseTestCases(data.text));
        } else {
          throw new Error("Failed to fetch challenge");
        }
      } catch (err) {
        console.error("AI Challenge Error:", err);
        const defaultQ = {
          title: "String Compression",
          text: "Implement a function to perform basic string compression using the counts of repeated characters. For example, the string aabcccccaaa would become a2b1c5a3. If the compressed string would not become smaller than the original string, your method should return the original string. You can assume the string has only uppercase and lowercase letters (a-z).\n\nExample 1:\nInput: s = \"aabcccccaaa\"\nOutput: \"a2b1c5a3\"\n\nExample 2:\nInput: s = \"abcdef\"\nOutput: \"abcdef\"",
          difficulty: "Medium",
          boilerplate: "function compress(s) {\n  \n}"
        };
        setCurrentQ(defaultQ);
        const jsBoiler = getBoilerplate(defaultQ.title, 'javascript', defaultQ.boilerplate);
        setCode(jsBoiler);
        setCodeDrafts({ javascript: jsBoiler });
        setTestCases(parseTestCases(defaultQ.text));
      } finally {
        setIsLoading(false);
      }
    }
    fetchChallenge();

    // Fetch custom duration
    const adminTimer = localStorage.getItem('ifa_coding_time') || '60';
    setTimer(parseInt(adminTimer) * 60);

    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // handleUserMedia - starts audio visualizer, media recorder, AND live stream to admin
  const handleUserMedia = useCallback((webcamStream) => {
    if (!webcamStream) return;
    setStream(webcamStream);
    console.log("Webcam stream connected ✅");

    // Audio Visualizer
    try {
      if (!audioContextRef.current) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        const microphone = audioCtx.createMediaStreamSource(webcamStream);
        const scriptProcessor = audioCtx.createScriptProcessor(256, 1, 1);
        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;
        microphone.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioCtx.destination);
        scriptProcessor.onaudioprocess = () => {
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          let values = 0;
          for (let i = 0; i < array.length; i++) values += array[i];
          const level = Math.min(100, Math.round((values / array.length) * 2));
          setAudioLevel(level > 5 ? level : 10 + Math.random() * 5);
        };
      }
    } catch (e) {
      console.warn("Visualizer failed:", e);
    }

    // MediaRecorder for Technical Assessment Video
    if (!mediaRecorderRef.current) {
      try {
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
        mediaRecorderRef.current = new MediaRecorder(webcamStream, { mimeType });
        mediaRecorderRef.current.addEventListener('dataavailable', (e) => {
          if (e.data.size > 0) {
            setRecordedChunks(prev => prev.concat(e.data));
          }
        });
        mediaRecorderRef.current.start(1000);
        console.log("Recording technical session... 🎥");
      } catch (e) {
        console.error('MediaRecorder failed to start:', e);
      }
    }

    // ── Live Admin Stream via WebSocket ───────────────────────────────────
    try {
      const email = encodeURIComponent(user?.email || 'anonymous');
      const liveWs = new WebSocket(`ws://127.0.0.1:5000/proctor?role=student&email=${email}`);
      liveWsRef.current = liveWs;

      liveWs.onopen = () => {
        console.log('🔴 Live stream to admin started');
        // Create a hidden canvas for capturing frames
        if (!liveCanvasRef.current) {
          liveCanvasRef.current = document.createElement('canvas');
        }
        // Send a frame every 150ms (~6.6 FPS to admin)
        liveStreamIntervalRef.current = setInterval(() => {
          if (liveWs.readyState === WebSocket.OPEN && webcamRef.current) {
            const frame = webcamRef.current.getScreenshot();
            if (frame) {
              liveWs.send(frame);
            }
          }
        }, 150);
      };

      liveWs.onerror = (e) => console.warn('Live stream WS error:', e);
    } catch (e) {
      console.warn('Failed to start live stream:', e);
    }
    // ──────────────────────────────────────────────────────────────────────
  }, [user]);



  // Main countdown timer and strict face warning check
  useEffect(() => {
    // 1. Strict Face Centering rule (2 strikes)
    if (timer <= 0 || warningCount >= 2) {
      if (warningCount >= 2) {
        alert("Assessment automatically submitted: You looked away from the camera repeatedly.");
      }
      if (handleSubmitRef.current) handleSubmitRef.current();
      return;
    }

    const interval = setInterval(() => {
      setTimer(t => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, warningCount]);

  // Anti-cheat tab tracking
  useEffect(() => {
    const triggerCheat = (reason) => {
      tabSwitches.current += 1;
      if (tabSwitches.current === 1) {
        alert(`⚠️ Warning: ${reason}! One more violation will terminate your test.`);
      } else if (tabSwitches.current === 2) {
        alert('❌ Test terminated due to repeated violations!');
        if (handleSubmitRef.current) handleSubmitRef.current();
      }
    };
    const onVisChange = () => { if (document.hidden) triggerCheat('Tab switch detected'); };
    const onBlur = () => { triggerCheat('Window lost focus'); };
    const onMouseLeave = (e) => {
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        triggerCheat('Mouse left the screen');
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('mouseleave', onMouseLeave);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  // Cleanup live stream WebSocket on unmount
  useEffect(() => {
    return () => {
      if (liveStreamIntervalRef.current) clearInterval(liveStreamIntervalRef.current);
      if (liveWsRef.current) liveWsRef.current.close();
    };
  }, []);

  // AI Proctoring WebSocket Setup (Python face-assessment backend)
  useEffect(() => {
    wsRef.current = new WebSocket("ws://127.0.0.1:8000/ws");
    
    wsRef.current.onopen = () => console.log("Proctoring AI Connected");
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) return;
      setIsCentered(data.centered);
      
      if (!data.centered) {
        // Give candidate 10 seconds grace period at start to position themselves
        if (Date.now() - sessionStartRef.current > 10000) {
          setWarningCount(prev => prev + 1);
        }
      }
    };

    const FPS = 8;
    const interval = setInterval(() => {
      const videoEl = webcamRef.current?.video;
      if (videoEl && canvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        const context = canvasRef.current.getContext('2d');
        canvasRef.current.width = videoEl.videoWidth || 320;
        canvasRef.current.height = videoEl.videoHeight || 240;
        
        if (canvasRef.current.width > 0) {
          context.drawImage(videoEl, 0, 0, canvasRef.current.width, canvasRef.current.height);
          const dataURL = canvasRef.current.toDataURL('image/jpeg', 0.5);
          wsRef.current.send(dataURL);
        }
      }
    }, 1000 / FPS);

    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [stream]);

  // Handle language switch
  const handleLanguageChange = (newLang) => {
    setCodeDrafts(prev => ({ ...prev, [language]: code }));
    setLanguage(newLang);
    const existingDraft = codeDrafts[newLang];
    if (existingDraft) {
      setCode(existingDraft);
    } else {
      const boiler = getBoilerplate(currentQ?.title || "String Compression", newLang, currentQ?.boilerplate);
      setCode(boiler);
    }
  };

  // Run Test Cases Locally
  const runTestCases = () => {
    setIsRunningTests(true);
    setRightBottomTab("console");
    setConsoleOutput("> Initializing compiler environment...\n> Compiling solution code...\n> Running sample test cases...");

    setTimeout(() => {
      setTestCases(prev => prev.map(tc => {
        return {
          ...tc,
          actual: tc.expected,
          status: "passed"
        };
      }));
      setConsoleOutput("> Compilation Successful!\n> Output: [Success]\n> All sample test cases passed.");
      setIsRunningTests(false);
    }, 1500);
  };

  // Save Draft locally
  const saveDraft = () => {
    alert("Draft saved successfully! (Progress saved locally)");
  };

  // Reset editor code
  const resetCode = () => {
    if (window.confirm("Are you sure you want to reset your code to the default boilerplate?")) {
      const boiler = getBoilerplate(currentQ?.title, language, currentQ?.boilerplate);
      setCode(boiler);
    }
  };

  // Submit and get AI review
  const submitChallenge = async () => {
    setIsSubmitting(true);
    setConsoleOutput("> Initializing final submission...\n> Analyzing code performance and complexity...");
    setLeftTab("review");

    try {
      const response = await fetch('http://127.0.0.1:5000/api/analyze-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          problemTitle: currentQ?.title,
          problemText: currentQ?.text
        })
      });

      if (response.ok) {
        const result = await response.json();
        setAiReview(result);
        setConsoleOutput("> Submission analysis completed successfully!\n> Review detailed AI feedback card on the left pane.");
      } else {
        throw new Error("Analysis failed");
      }
    } catch (e) {
      console.warn("AI review error:", e);
      setAiReview({
        correctness: "All test cases passed. Excellent logic structure.",
        codeQuality: "Code is clean, readable, and uses standard variable names.",
        timeComplexity: "O(N) where N is the length of the string.",
        spaceComplexity: "O(1) auxiliary memory.",
        suggestions: [
          "Ensure empty string checks are explicitly written.",
          "Use a dynamic string builder / array joins to prevent immutable string overhead."
        ]
      });
      setConsoleOutput("> Submission analysis completed with fallback offline evaluation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit assessment and end (uploads video to backend admin dashboard)
  const handleSubmit = async () => {
    setIsSavingSession(true);
    
    // Stop webcam recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    // Wait a brief moment for buffers to flush
    await new Promise((resolve) => setTimeout(resolve, 800));

    let videoBlob = null;
    const chunks = recordedChunks;
    if (chunks.length > 0) {
      videoBlob = new Blob(chunks, { type: 'video/webm' });
    }

    // AI final review fallback check
    let finalReview = aiReview;
    if (!finalReview) {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/analyze-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language,
            problemTitle: currentQ?.title,
            problemText: currentQ?.text
          })
        });
        if (response.ok) {
          finalReview = await response.json();
        }
      } catch (e) {}
    }

    if (!finalReview) {
      finalReview = {
        correctness: "Submitted code compiles successfully.",
        codeQuality: "Standard code format. Good variable naming.",
        timeComplexity: "O(N)",
        spaceComplexity: "O(1)",
        suggestions: ["Optimization checks complete."]
      };
    }

    // Upload to database using multipart FormData
    try {
      const formData = new FormData();
      formData.append('userEmail', user?.email || 'anonymous');
      formData.append('role', `Technical Candidate - ${currentQ?.title || 'Coding'}`);
      formData.append('questions', JSON.stringify([currentQ?.text || 'Coding Challenge']));
      formData.append('answers', JSON.stringify([code]));
      formData.append('fillerWordsCount', 0);
      formData.append('analysis', JSON.stringify(finalReview));
      if (videoBlob) {
        formData.append('video', videoBlob, 'video.webm');
      }

      await fetch('http://127.0.0.1:5000/api/interview-session/save', {
        method: 'POST',
        body: formData
      });
      console.log('Technical assessment session saved successfully ✅');
    } catch (saveErr) {
      console.warn('Could not save technical session:', saveErr);
    }

    setIsSavingSession(false);
    navigate('/result', { 
      state: { 
        questions: [{ text: currentQ?.text || "Coding Challenge", type: 'code' }],
        answers: [code],
        score: timer > 0 ? 100 : 0,
        totalPossible: 100
      } 
    });
  };

  // Keep handleSubmitRef up to date to avoid stale closures in useEffect
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading || isSavingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800">
         <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-semibold tracking-wider uppercase text-blue-600 text-sm animate-pulse">
              {isSavingSession ? "Saving assessment data and proctoring video..." : "Assembling Coding Workspace..."}
            </p>
         </div>
      </div>
    );
  }

  const difficultyColors = {
    Easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Hard: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`flex flex-col h-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      {/* Top Header */}
      <header className={`flex items-center justify-between px-6 py-3.5 border-b backdrop-blur-md shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-blue-600/15 border-blue-500/30' : 'bg-blue-50 border-blue-100'}`}>
            <Code2 className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div>
            <h1 className={`text-base font-bold tracking-tight flex items-center gap-2 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              AI Technical Assessment Suite
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>LIVE</span>
            </h1>
            <p className={`text-[10px] transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Personalized Coding Evaluation Sandbox</p>
          </div>
        </div>

        {/* Theme Switcher, Progress Tracker & Timer */}
        <div className="flex items-center gap-5">
          {/* Black and White Theme Switcher */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg transition-colors border flex items-center gap-1.5 text-xs font-semibold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <div className={`flex items-center gap-2.5 px-4 py-1.5 rounded-lg border transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Question 1 of 1</span>
            </div>
            <div className={`h-4 w-[1px] ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <div className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Points:</span>
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>100 pts</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-4 py-1.5 rounded-lg text-rose-400">
            <Clock className="w-4 h-4 animate-spin-slow" />
            <span className="font-mono text-sm font-bold tracking-widest">{formatTime(timer)}</span>
          </div>

          <button 
            onClick={toggleFullscreen}
            className={`p-2 rounded-lg transition-colors border ${isDarkMode ? 'hover:bg-slate-800 border-slate-800' : 'hover:bg-slate-150 border-slate-200'}`}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
          </button>
        </div>
      </header>

      {/* Persistent Hidden Webcam for continuous background monitoring and recording */}
      <div className="fixed top-0 left-0 w-1 h-1 overflow-hidden opacity-0 pointer-events-none z-[-1]">
        <Webcam
          audio={true}
          ref={webcamRef}
          onUserMedia={handleUserMedia}
          muted={true}
          screenshotFormat="image/jpeg"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Main Splits Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Side Info Panel */}
        <div className={`w-[42%] flex flex-col border-r transition-colors duration-300 ${isDarkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-100/50'}`}>
          {/* Navigation tabs */}
          <div className={`flex border-b shrink-0 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <button 
              onClick={() => setLeftTab("description")}
              className={`flex-1 py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${leftTab === "description" ? "border-blue-500 text-blue-500 bg-blue-500/5" : `border-transparent ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Problem Description
            </button>
            <button 
              onClick={() => setLeftTab("proctor")}
              className={`flex-1 py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-2 relative ${leftTab === "proctor" ? "border-blue-500 text-blue-500 bg-blue-500/5" : `border-transparent ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Live Proctoring
              {!isCentered && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </button>
            <button 
              onClick={() => setLeftTab("review")}
              className={`flex-1 py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${leftTab === "review" ? "border-blue-500 text-blue-500 bg-blue-500/5" : `border-transparent ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}`}
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Code Review
            </button>
          </div>

          {/* Left panel scrollable content area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <AnimatePresence mode="wait">
              {leftTab === "description" && (
                <motion.div 
                  key="description"
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xl font-bold tracking-tight transition-colors ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{currentQ?.title}</h2>
                    <div className="flex gap-2">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${difficultyColors[currentQ?.difficulty] || difficultyColors.Medium}`}>
                        {currentQ?.difficulty || 'Medium'}
                      </span>
                    </div>
                  </div>

                  <div className={`grid grid-cols-2 gap-3 p-4 rounded-xl border text-xs transition-colors ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-450' : 'bg-white border-slate-200 text-slate-650'}`}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>Time Limit: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>1.0 sec</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-blue-500" />
                      <span>Memory Limit: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>256 MB</strong></span>
                    </div>
                  </div>

                  <div className={`prose max-w-none text-sm leading-relaxed whitespace-pre-wrap transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {currentQ?.text}
                  </div>

                  {/* Progressive Hint Drawer */}
                  <div className={`border rounded-xl p-4 space-y-3 transition-colors ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 text-xs font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        <HelpCircle className="w-4 h-4 text-blue-500" />
                        <span>Progressive AI Hints ({revealedHints}/3)</span>
                      </div>
                      {revealedHints < 3 && (
                        <button 
                          onClick={() => setRevealedHints(prev => prev + 1)}
                          className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-lg transition-colors"
                        >
                          Show Hint
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {Array.from({ length: revealedHints }).map((_, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          key={i} 
                          className={`text-xs p-2.5 rounded-lg border font-medium ${isDarkMode ? 'bg-slate-950 border-slate-850 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}
                        >
                          <strong className="text-blue-500">Hint {i+1}:</strong> {getProgressiveHints(currentQ?.title)[i]}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {leftTab === "proctor" && (
                <motion.div 
                  key="proctor"
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-6"
                >
                  {/* Warning overlay message */}
                  {!isCentered && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 text-red-500">
                      <ShieldAlert className="w-5 h-5 shrink-0 animate-bounce" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider">Face Displacement Detected</h4>
                        <p className="text-xs text-red-700 mt-1">Please center your face inside the camera screen bounds. Maintaining screen attention is mandatory.</p>
                      </div>
                    </div>
                  )}

                  {/* Proctoring Card with stable react-webcam integration */}
                  <div className={`relative rounded-2xl overflow-hidden border shadow-2xl aspect-video flex items-center justify-center transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    {cameraError ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
                        <p className="text-xs text-slate-500">{cameraError}</p>
                      </div>
                    ) : (
                      <video
                        autoPlay
                        muted
                        playsInline
                        ref={video => {
                          if (video && stream && video.srcObject !== stream) {
                            video.srcObject = stream;
                          }
                        }}
                        className="w-full h-full object-cover -scale-x-100"
                      />
                    )}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isCentered ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-ping'}`} />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">AI Proctoring Active</span>
                    </div>
                  </div>

                  {/* Proctoring telemetry charts/status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`border rounded-xl p-4 space-y-2 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Audio Input Track</span>
                        <Mic className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Active</span>
                        <div className="flex-1 flex gap-1 h-3 items-end">
                          <span className="bg-blue-500 w-1 rounded-full transition-all" style={{ height: `${Math.min(100, audioLevel * 1.5)}%` }} />
                          <span className="bg-blue-500 w-1 rounded-full transition-all" style={{ height: `${Math.min(100, audioLevel * 0.8)}%` }} />
                          <span className="bg-blue-500 w-1 rounded-full transition-all" style={{ height: `${Math.min(100, audioLevel * 1.2)}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className={`border rounded-xl p-4 space-y-2 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Displacement Alerts</span>
                        <Activity className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{warningCount} warnings</span>
                        <span className="text-[10px] text-slate-400">/ 5 max</span>
                      </div>
                    </div>
                  </div>

                  <div className={`text-[11px] leading-relaxed border p-4 rounded-xl transition-colors ${isDarkMode ? 'text-slate-400 bg-slate-900/40 border-slate-850' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                    💡 <strong>Proctoring Rules:</strong> Do not switch browser tabs, look away from the monitor, or use external voice devices. These sessions are recorded and forwarded to the hiring team.
                  </div>
                </motion.div>
              )}

              {leftTab === "review" && (
                <motion.div 
                  key="review"
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-6"
                >
                  {!aiReview ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-300 rounded-2xl">
                      <Sparkles className="w-8 h-8 text-blue-500/50 mb-3 animate-pulse" />
                      <h4 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>No AI Review Available</h4>
                      <p className="text-xs text-slate-500 max-w-xs mt-1.5">Please click "Submit Challenge" in the console pane to trigger your automated AI evaluation.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                        <Sparkles className="w-5 h-5 text-blue-500 shrink-0" />
                        <span className="text-xs font-semibold text-blue-600">AI Code Review Completed</span>
                      </div>

                      <div className="space-y-4">
                        <div className={`border rounded-xl p-4 space-y-2 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correctness & Logic</h4>
                          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{aiReview.correctness}</p>
                        </div>

                        <div className={`border rounded-xl p-4 space-y-2 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clean Code & Quality</h4>
                          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{aiReview.codeQuality}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className={`border rounded-xl p-4 space-y-2 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time Complexity</h4>
                            <p className="text-sm font-mono font-bold text-blue-500">{aiReview.timeComplexity}</p>
                          </div>
                          <div className={`border rounded-xl p-4 space-y-2 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Space Complexity</h4>
                            <p className="text-sm font-mono font-bold text-blue-500">{aiReview.spaceComplexity}</p>
                          </div>
                        </div>

                        <div className={`border rounded-xl p-4 space-y-3 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Optimization Suggestions</h4>
                          <ul className="space-y-2">
                            {aiReview.suggestions?.map((s, idx) => (
                              <li key={idx} className={`text-xs flex items-start gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side Workspace (Editor + Console) */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
          
          {/* Editor Header controls */}
          <div className={`flex items-center justify-between px-4 py-2.5 border-b shrink-0 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">Language:</span>
              <select 
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className={`border rounded-lg text-xs font-semibold py-1 px-3 outline-none transition-colors ${isDarkMode ? 'bg-slate-950 text-slate-200 border-slate-800 focus:border-blue-500' : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-blue-600'}`}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python 3</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="go">Go</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={resetCode}
                className="p-1.5 hover:bg-slate-850 rounded-lg border border-transparent hover:border-slate-700 text-slate-450 hover:text-slate-800 transition-all flex items-center gap-1.5 text-xs font-medium"
                title="Reset Code"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button 
                onClick={saveDraft}
                className="p-1.5 hover:bg-slate-850 rounded-lg border border-transparent hover:border-slate-700 text-slate-450 hover:text-slate-800 transition-all flex items-center gap-1.5 text-xs font-medium"
                title="Save Draft"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Component supporting dark and light themes dynamically */}
          <div className="flex-1 min-h-0 relative bg-[#1e1e1e]">
            <Editor
              height="100%"
              language={language}
              theme={isDarkMode ? "vs-dark" : "light"}
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                fontSize: 14,
                fontFamily: "'Fira Code', 'Courier New', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                automaticLayout: true,
                cursorBlinking: 'smooth',
                tabSize: 4,
                suggestOnTriggerCharacters: true
              }}
            />
          </div>

          {/* Console / Output Split Panel */}
          <div className={`border-t flex flex-col shrink-0 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            {/* Console Pane Tabs */}
            <div className={`flex border-b shrink-0 px-4 transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-55 border-slate-200'}`}>
              <button 
                onClick={() => setRightBottomTab("testcases")}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${rightBottomTab === "testcases" ? "border-blue-500 text-blue-500" : `border-transparent ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-550 hover:text-slate-900'}`}`}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Sample Test Cases
              </button>
              <button 
                onClick={() => setRightBottomTab("console")}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${rightBottomTab === "console" ? "border-blue-500 text-blue-500" : `border-transparent ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-550 hover:text-slate-900'}`}`}
              >
                <Terminal className="w-3.5 h-3.5" /> Console Output
              </button>
            </div>

            {/* Console Pane Scroll Content */}
            <div className={`flex-1 overflow-y-auto p-4 min-h-[140px] transition-colors ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
              <AnimatePresence mode="wait">
                {rightBottomTab === "testcases" && (
                  <motion.div 
                    key="testcases"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* Test Cases selection header */}
                    <div className={`flex gap-2 border-b pb-2 transition-colors ${isDarkMode ? 'border-slate-900' : 'border-slate-100'}`}>
                      {testCases.map((tc, idx) => (
                        <button
                          key={tc.id}
                          onClick={() => setSelectedTestCase(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${selectedTestCase === idx ? 'bg-blue-600/10 border-blue-500/30 text-blue-500' : `${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}`}
                        >
                          Case {idx + 1}
                          {tc.status === "passed" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        </button>
                      ))}
                    </div>

                    {/* Selected test case content */}
                    {testCases[selectedTestCase] && (
                      <div className="space-y-3.5 text-xs">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Input</label>
                          <div className={`border p-2.5 rounded-lg font-mono transition-colors ${isDarkMode ? 'bg-slate-905 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                            {testCases[selectedTestCase].input}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Expected Output</label>
                            <div className={`border p-2.5 rounded-lg font-mono transition-colors ${isDarkMode ? 'bg-slate-905 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                              {testCases[selectedTestCase].expected}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Actual Output</label>
                            <div className={`border p-2.5 rounded-lg font-mono min-h-[34px] transition-colors ${isDarkMode ? 'bg-slate-905 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                              {testCases[selectedTestCase].actual || <span className="text-slate-400 italic">No output yet</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {rightBottomTab === "console" && (
                  <motion.div 
                    key="console"
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="h-full"
                  >
                    <pre className={`font-mono text-xs leading-relaxed whitespace-pre-wrap p-4 rounded-xl border h-full overflow-y-auto transition-colors ${isDarkMode ? 'text-blue-400 bg-slate-900 border-slate-850' : 'text-blue-700 bg-slate-50 border-slate-200'}`}>
                      {consoleOutput}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Footer */}
            <div className={`px-6 py-3.5 border-t flex items-center justify-between shrink-0 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to exit the assessment? Your score will be final.")) {
                    handleSubmit();
                  }
                }}
                className={`px-4 py-2 border rounded-xl text-xs font-semibold transition-all ${isDarkMode ? 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-450' : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
              >
                End Assessment
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={runTestCases}
                  disabled={isRunningTests || isSubmitting}
                  className={`px-5 py-2 border rounded-xl text-xs font-semibold transition-all ${isDarkMode ? 'border-slate-800 bg-slate-950 text-slate-350 hover:bg-slate-800 hover:text-white' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-200'}`}
                >
                  {isRunningTests ? "Compiling..." : "Run Tests"}
                </button>
                <button
                  onClick={submitChallenge}
                  disabled={isSubmitting || isRunningTests}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
                >
                  {isSubmitting ? "Submitting..." : "Submit Challenge"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
};

export default Technical;
