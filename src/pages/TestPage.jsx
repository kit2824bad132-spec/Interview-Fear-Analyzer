import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, ChevronRight, Code2, FileText, CheckSquare, Camera } from 'lucide-react';
import Webcam from 'react-webcam';
import { useAuth } from '../context/AuthContext';
export default function TestPage() {
  const navigate = useNavigate();
  const allQuestions = JSON.parse(localStorage.getItem('ifa_questions') || '[]');
  // Only enabled questions
  const [questions] = useState(() => allQuestions.filter(q => q.enabled !== false));
  const codingTime = parseInt(localStorage.getItem('ifa_coding_time') || '60', 10);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null);      // for MCQ
  const [textAnswer, setTextAnswer] = useState('');    // for text/code
  const [timeLeft, setTimeLeft] = useState(null);
  const [tabWarning, setTabWarning] = useState(0);
  const [toast, setToast] = useState(null);
  const tabSwitches = useRef(0);
  const testStartTime = useRef(Date.now());
  const webcamRef = useRef(null);
  const wsRef = useRef(null);
  const { user } = useAuth();

  const currentQ = questions[current];
  const isCode = currentQ?.type === 'code';
  const isText = currentQ?.type === 'text';
  const isMCQ = !isCode && !isText;
  const timerForQ = isCode ? codingTime : 30;

  // Reset timer when question changes
  useEffect(() => {
    setTimeLeft(timerForQ);
    setSelected(null);
    setTextAnswer('');
  }, [current]);

  // Countdown timer
  useEffect(() => {
    if (tabWarning >= 2 || timeLeft === null) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleNext(true);
          return timerForQ;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [current, tabWarning, timeLeft]);

  // Live Proctoring WebSocket
  useEffect(() => {
    if (!user?.email) return;
    
    const ws = new WebSocket(`ws://127.0.0.1:5000/proctor?email=${user.email}`);
    wsRef.current = ws;
    
    return () => {
      ws.close();
    };
  }, [user]);

  // Frame streaming
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && webcamRef.current) {
        const frame = webcamRef.current.getScreenshot();
        if (frame) {
          wsRef.current.send(frame);
        }
      }
    }, 150); // ~6.6 FPS
    
    return () => clearInterval(interval);
  }, []);

  // Anti-cheat
  useEffect(() => {
    const triggerCheat = (reason) => {
      tabSwitches.current += 1;
      if (tabSwitches.current === 1) {
        setTabWarning(1);
        showToast(`⚠️ Warning: ${reason}! One more violation will terminate your test.`, 'warn');
      } else if (tabSwitches.current === 2) {
        setTabWarning(2);
        showToast('❌ Test terminated due to repeated violations!', 'error');
        const elapsed = Math.round((Date.now() - testStartTime.current) / 1000);
        setTimeout(() => navigate('/result', { state: { answers, questions, terminated: true, timeTaken: elapsed, tabSwitches: tabSwitches.current } }), 2000);
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
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('blur', onBlur);
    };
  }, [answers, questions, navigate]);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleNext = (auto = false) => {
    const userAnswer = isMCQ ? (auto && selected === null ? -1 : selected)
      : (auto && !textAnswer.trim() ? '' : textAnswer.trim());
    const newAnswers = { ...answers, [current]: userAnswer };
    setAnswers(newAnswers);
    if (current >= questions.length - 1) {
      const elapsed = Math.round((Date.now() - testStartTime.current) / 1000);
      navigate('/result', { state: { answers: newAnswers, questions, terminated: false, timeTaken: elapsed, tabSwitches: tabSwitches.current } });
    } else {
      setCurrent(c => c + 1);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No questions available.</p>
          <p className="text-gray-400 text-sm mt-1">Ask an admin to enable questions.</p>
        </div>
      </div>
    );
  }

  const progress = (current / questions.length) * 100;
  const timerPct = timeLeft !== null ? (timeLeft / timerForQ) * 100 : 100;
  const typeIcon = isCode ? <Code2 className="w-4 h-4" /> : isText ? <FileText className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'warn' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bars */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Question {current + 1} of {questions.length}</span>
          <span className={`font-mono font-semibold flex items-center gap-1 ${timeLeft !== null && timeLeft <= 10 ? 'text-red-500' : 'text-gray-600'}`}>
            <Clock className="w-3 h-3" />{timeLeft ?? timerForQ}s {isCode && <span className="text-purple-600 font-normal">(coding)</span>}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
          <motion.div className="h-full bg-black rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <motion.div className={`h-full rounded-full ${timeLeft !== null && timeLeft <= 10 ? 'bg-red-400' : isCode ? 'bg-purple-400' : 'bg-green-400'}`}
            animate={{ width: `${timerPct}%` }} transition={{ duration: 1 }} />
        </div>
      </div>

      {/* Warning banner */}
      {tabWarning === 1 && (
        <div className="mb-4 flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-2.5 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" /> Warning: Violation detected. Next violation will terminate the test.
        </div>
      )}

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}
          className="bg-gray-50 border border-gray-100 rounded-2xl p-8">

          {/* Type + difficulty badges */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isCode ? 'bg-purple-100 text-purple-700' : isText ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
              {typeIcon}{isCode ? 'Code' : isText ? 'Text' : 'MCQ'}
            </span>
            {currentQ.difficulty && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${currentQ.difficulty === 'easy' ? 'bg-green-100 text-green-700' : currentQ.difficulty === 'hard' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {currentQ.difficulty}
              </span>
            )}
            {isCode && <span className="text-xs text-purple-600 font-medium ml-auto">⏱ {codingTime}s limit (admin set)</span>}
          </div>

          <p className="text-lg font-semibold text-gray-800 mb-6">{currentQ.text}</p>

          {/* MCQ options */}
          {isMCQ && (
            <div className="flex flex-col gap-3">
              {(currentQ.options || []).map((opt, i) => (
                <button key={i} onClick={() => setSelected(i)}
                  className={`text-left px-5 py-3.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${selected === i ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50'}`}>
                  <span className="mr-3 font-bold text-xs">{String.fromCharCode(65 + i)}.</span>{opt}
                </button>
              ))}
            </div>
          )}

          {/* Text answer */}
          {isText && (
            <textarea value={textAnswer} onChange={e => setTextAnswer(e.target.value)} rows={4}
              placeholder="Type your answer here..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-colors resize-none" />
          )}

          {/* Code answer */}
          {isCode && (
            <div className="flex flex-col gap-5">
              <div className="bg-black border-l-4 border-purple-500 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                  <Code2 className="w-3 h-3" /> Coding Mode: Challenge
                </div>
                <p className="text-white text-base font-medium whitespace-pre-wrap leading-relaxed">{currentQ.text}</p>
              </div>
              <div className="relative group">
                <div className="absolute top-4 right-4 z-10 opacity-40 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded tracking-widest uppercase">Editor</span>
                </div>
                <textarea
                  autoFocus
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Write your solution here..."
                  className="w-full h-80 bg-gray-900 text-gray-100 p-8 rounded-2xl font-mono text-sm outline-none border-2 border-transparent focus:border-black transition-all resize-none shadow-2xl"
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end mt-4">
        <button onClick={() => handleNext(false)}
          disabled={isMCQ ? selected === null : !textAnswer.trim()}
          className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
          {current === questions.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Proctoring Camera Overlay */}
      <div className="fixed bottom-6 right-6 w-48 h-36 rounded-2xl overflow-hidden border-2 border-black shadow-2xl bg-gray-900 z-40 group">
        <Webcam
          ref={webcamRef}
          audio={false}
          className="w-full h-full object-cover"
          screenshotFormat="image/jpeg"
          videoConstraints={{ width: 320, height: 240, facingMode: "user" }}
        />
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[8px] font-bold text-white uppercase tracking-tighter">Live Proctoring</span>
        </div>
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/20 transition-colors pointer-events-none" />
      </div>
    </div>
  );
}
