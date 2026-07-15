import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, RefreshCw, Home, Code2, FileText, CheckSquare, Brain, Target, Zap, Activity, Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!state) return <div className="text-center mt-20 text-gray-400">No results found. <button onClick={() => navigate('/home')} className="underline">Go Home</button></div>;
  const { answers, questions, terminated, timeTaken, interviewFeedback, type, tabSwitches } = state;
  const isInterview = type === 'interview';

  // Heuristic grading for text and code
  const gradeTextOrCode = (userAns, correctAns) => {
    if (!userAns || !userAns.trim()) return false;
    if (!correctAns) return false;
    
    const uText = userAns.toLowerCase();
    const cText = correctAns.toLowerCase();
    if (uText === cText) return true;
    
    const uWords = uText.split(/\\W+/).filter(w => w.length > 1);
    const cWords = cText.split(/\\W+/).filter(w => w.length > 3); // focus on significant words
    
    if (cWords.length === 0) return uText.length > 5;
    
    let matches = 0;
    for (const cw of cWords) {
      if (uWords.includes(cw) || uText.includes(cw)) matches++;
    }
    return (matches / cWords.length) >= 0.4;
  };

  const savedRef = useRef(false);

  // Save result for admin view — split by question type for topic-wise tables
  useEffect(() => {
    if (state && user && !savedRef.current) {
      savedRef.current = true;
      const resultsToSave = [];

      if (isInterview) {
        // Interview results saved as single entry
        resultsToSave.push({
          userEmail: user.email,
          userName: user.name,
          percentage: interviewFeedback?.scores?.total || 0,
          correctCount: 0,
          totalQuestions: questions.length,
          timeTaken: timeTaken || 0,
          tabSwitches: tabSwitches || 0,
          answers: answers,
          type: 'interview'
        });
      } else {
        // Group questions by type
        const groups = { mcq: [], text: [], code: [] };
        questions.forEach((q, idx) => {
          const qType = q.type || 'mcq';
          const key = qType === 'mcq' ? 'mcq' : qType === 'text' ? 'text' : 'code';
          groups[key].push({ question: q, index: idx });
        });

        // Save separate result entry per question type
        Object.entries(groups).forEach(([typeName, group]) => {
          if (group.length === 0) return;

          let typeCorrect = 0;
          const typeAnswers = {};
          group.forEach(({ question: q, index: idx }) => {
            const ans = answers[idx];
            typeAnswers[idx] = ans;
            const isMCQ = (q.type || 'mcq') === 'mcq';

            if (ans === undefined || ans === -1 || ans === null || ans === '') {
              // skipped
            } else if (isMCQ) {
              if (ans === q.correct) typeCorrect++;
            } else {
              if (gradeTextOrCode(ans, q.answer)) typeCorrect++;
            }
          });

          const typePct = group.length > 0 ? Math.round((typeCorrect / group.length) * 100) : 0;

          resultsToSave.push({
            userEmail: user.email,
            userName: user.name,
            percentage: typePct,
            correctCount: typeCorrect,
            totalQuestions: group.length,
            timeTaken: timeTaken || 0,
            tabSwitches: tabSwitches || 0,
            answers: typeAnswers,
            type: typeName
          });
        });
      }

      // Send to backend
      fetch('http://127.0.0.1:5000/api/test-results/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultsToSave)
      })
      .then(res => res.json())
      .then(data => console.log('Saved results to DB:', data))
      .catch(err => console.error('Error saving results:', err));
    }
  }, [state, user, isInterview, interviewFeedback, questions, answers, timeTaken, tabSwitches]);

  // Score calculation for ALL questions
  let correct = 0, wrong = 0, skipped = 0;
  questions.forEach((q, idx) => {
    const ans = answers[idx];
    const qType = q.type || 'mcq';
    const isMCQ = qType === 'mcq';
    
    if (ans === undefined || ans === -1 || ans === null || ans === '') {
      skipped++;
    } else if (isMCQ) {
      if (ans === q.correct) correct++;
      else wrong++;
    } else {
      if (gradeTextOrCode(ans, q.answer)) correct++;
      else wrong++;
    }
  });

  const total = questions.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const TYPE_ICON = {
    mcq: <CheckSquare className="w-3.5 h-3.5" />,
    text: <FileText className="w-3.5 h-3.5" />,
    code: <Code2 className="w-3.5 h-3.5" />,
    interview: <Mic className="w-3.5 h-3.5" />,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-2xl mx-auto">
      {terminated && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl font-medium">
          ❌ Your test was terminated due to repeated violations. Results have been recorded.
        </div>
      )}

      {/* Score card */}
      <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center relative shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            <Trophy className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-extrabold text-black mb-1">
          {isInterview ? `${interviewFeedback?.scores?.total}%` : `${pct}%`}
        </h1>
        <p className="text-gray-500 text-sm mb-2">{isInterview ? 'Behavioral Performance Score' : 'Score based on MCQ questions'}</p>
        <p className="text-base font-medium text-gray-700 mb-6 px-4">
          {isInterview ? interviewFeedback?.summary : (pct >= 70 ? '🎉 Great job!' : pct >= 40 ? '👍 Good effort!' : '💪 Keep practicing!')}
        </p>

        {isInterview ? (
          <div className="grid grid-cols-3 gap-3">
             <div className="bg-blue-50 text-blue-700 rounded-2xl p-4 flex flex-col items-center gap-1 border border-blue-100">
                <Zap className="w-4 h-4" />
                <span className="text-xl font-bold">{interviewFeedback?.scores?.confidence}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Confidence</span>
             </div>
             <div className="bg-emerald-50 text-emerald-700 rounded-2xl p-4 flex flex-col items-center gap-1 border border-emerald-100">
                <Target className="w-4 h-4" />
                <span className="text-xl font-bold">{interviewFeedback?.scores?.clarity}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Clarity</span>
             </div>
             <div className="bg-purple-50 text-purple-700 rounded-2xl p-4 flex flex-col items-center gap-1 border border-purple-100">
                <Activity className="w-4 h-4" />
                <span className="text-xl font-bold">{interviewFeedback?.scores?.eyeContact}%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Face Metrics</span>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Questions', value: total, color: 'bg-gray-100 text-gray-800' },
              { label: 'Correct', value: correct, color: 'bg-green-50 text-green-700' },
              { label: 'Wrong', value: wrong, color: 'bg-red-50 text-red-700' },
              { label: 'Skipped', value: skipped, color: 'bg-yellow-50 text-yellow-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${color} rounded-xl p-3`}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs font-medium mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isInterview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
           <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3 text-emerald-700">
                 <Brain className="w-5 h-5" />
                 <h3 className="font-bold">Key Strengths</h3>
              </div>
              <ul className="space-y-2">
                 {interviewFeedback?.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-emerald-800 flex gap-2">
                       <span className="shrink-0">•</span> {s}
                    </li>
                 ))}
              </ul>
           </div>
           <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3 text-amber-700">
                 <Target className="w-5 h-5" />
                 <h3 className="font-bold">Actionable Improvements</h3>
              </div>
              <ul className="space-y-2">
                 {interviewFeedback?.improvements.map((im, i) => (
                    <li key={i} className="text-sm text-amber-800 flex gap-2">
                       <span className="shrink-0">•</span> {im}
                    </li>
                 ))}
              </ul>
           </div>
        </div>
      )}

      {/* Breakdown */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col gap-3 mb-6">
        <h2 className="font-bold text-gray-800 mb-1">Question Breakdown</h2>
        {questions.map((q, i) => {
          const userAns = answers[i];
          const qType = q.type || 'mcq';
          const isMCQ = qType === 'mcq';
          const isInterviewResponse = qType === 'interview';
          const skippedQ = userAns === undefined || userAns === -1 || userAns === null || userAns === '';
          
          let isCorrect = false;
          if (!skippedQ) {
            isCorrect = isMCQ ? userAns === q.correct : gradeTextOrCode(userAns, q.answer);
          }

          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${isInterviewResponse ? 'bg-indigo-50 border-indigo-100' : isCorrect ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <span className="text-lg shrink-0">
                {isInterviewResponse ? '🎙️' : skippedQ ? '⏭️' : isCorrect ? '✅' : '❌'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${qType === 'code' ? 'bg-purple-100 text-purple-700' : qType === 'text' ? 'bg-blue-100 text-blue-700' : qType === 'interview' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {TYPE_ICON[qType]}{qType.toUpperCase()}
                  </span>
                  <p className="text-sm font-medium text-gray-800 truncate flex-1">{q.text}</p>
                </div>
                {isInterviewResponse ? (
                  <div className="mt-2 text-xs text-indigo-700 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                    <p className="font-bold uppercase tracking-wider text-[9px] mb-1 opacity-60">Spoken Response:</p>
                    <p className="italic leading-relaxed">"{userAns || "No response recorded."}"</p>
                  </div>
                ) : isMCQ ? (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Your answer: <span className={isCorrect ? 'text-green-700 font-semibold' : 'text-red-600 font-semibold'}>
                      {skippedQ ? 'Skipped' : (q.options || [])[userAns] || '?'}
                    </span>
                    {!isCorrect && !skippedQ && <span className="text-gray-400"> · Correct: <span className="text-green-700 font-semibold">{(q.options || [])[q.correct]}</span></span>}
                  </p>
                ) : (
                  <div className="text-xs text-gray-500 mt-1">
                    {userAns ? (
                      <p className={`mt-1 bg-white rounded px-3 py-2 font-mono border ${isCorrect ? 'border-green-200 text-green-800' : 'border-red-200 text-red-800'} max-h-24 overflow-y-auto whitespace-pre-wrap`}>
                        {userAns}
                      </p>
                    ) : (
                      <p className="mt-1 text-gray-400 italic">Skipped</p>
                    )}
                    {!isCorrect && !skippedQ && q.answer && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded text-green-800">
                        <p className="font-bold text-[10px] uppercase mb-1">Expected Answer / Keywords:</p>
                        <p className="font-mono whitespace-pre-wrap">{q.answer}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate('/home')} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer">
          <Home className="w-4 h-4" /> Home
        </button>
        <button onClick={() => navigate('/test')} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Retake Test
        </button>
      </div>
    </motion.div>
  );
}
