import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Plus, Pencil, Trash2, Save, X,
  Clock, ToggleLeft, ToggleRight, ChevronDown, Eye, EyeOff,
  Radio, Wifi, WifiOff, Monitor
} from 'lucide-react';

const EMPTY_Q = {
  text: '', type: 'mcq', options: ['', '', '', ''], correct: 0,
  answer: '', difficulty: 'medium', enabled: true,
};

const TYPE_LABELS = { mcq: 'MCQ', text: 'Text', code: 'Code' };
const DIFF_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

const CODING_TIMES = [30, 60, 120, 180, 300];

export default function AdminPanel() {
  const [questions, setQuestions] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_Q);
  const [codingTime, setCodingTime] = useState(60);
  const [timeSaved, setTimeSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('questions');
  const [results, setResults] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [interviewSessions, setInterviewSessions] = useState([]);
  const [expandedSession, setExpandedSession] = useState(null);
  const [expandedResume, setExpandedResume] = useState(null);

  // Live Monitor State
  const [liveFeeds, setLiveFeeds] = useState({}); // email -> { frame: dataURL, active: bool }
  const [wsStatus, setWsStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected' | 'error'
  const adminWsRef = useRef(null);
  const liveFramesRef = useRef({});

  useEffect(() => {
    setQuestions(JSON.parse(localStorage.getItem('ifa_questions') || '[]'));
    setCodingTime(parseInt(localStorage.getItem('ifa_coding_time') || '60', 10));
  }, []);

  useEffect(() => {
    let interval;
    if (activeTab === 'results') {
      const fetchResults = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/test-results`);
          if (res.ok) setResults(await res.json());
        } catch (err) { console.error('Failed to fetch results', err); }
      };
      fetchResults();
      interval = setInterval(fetchResults, 5000);
    } else if (activeTab === 'resumes') {
      const fetchResumes = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/admin/users`);
          if (res.ok) setResumes(await res.json());
        } catch (err) { console.error('Failed to fetch resumes', err); }
      };
      fetchResumes();
      interval = setInterval(fetchResumes, 5000);
    } else if (activeTab === 'interviews') {
      const fetchSessions = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/admin/interview-sessions`);
          if (res.ok) setInterviewSessions(await res.json());
        } catch (err) { console.error('Failed to fetch sessions', err); }
      };
      fetchSessions();
      interval = setInterval(fetchSessions, 5000);
    } else if (activeTab === 'live') {
      setWsStatus('connecting');
      setLiveFeeds({});
      liveFramesRef.current = {};

      // Connect admin WebSocket for live monitoring
      const ws = new WebSocket(`${import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:5000'}/proctor?role=admin`);
      adminWsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        console.log('Admin WS connected');
      };

      ws.onerror = (err) => {
        setWsStatus('error');
        console.error('Admin WS error:', err);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'student_list') {
          const feeds = {};
          data.students.forEach(email => { feeds[email] = { frame: null, active: true }; });
          setLiveFeeds(feeds);
        } else if (data.type === 'student_joined') {
          setLiveFeeds(prev => ({ ...prev, [data.email]: { frame: prev[data.email]?.frame || null, active: true } }));
        } else if (data.type === 'student_left') {
          setLiveFeeds(prev => ({ ...prev, [data.email]: { ...prev[data.email], active: false } }));
        } else if (data.type === 'frame') {
          liveFramesRef.current[data.email] = data.frame;
        }
      };
      ws.onclose = () => {
        setWsStatus('disconnected');
        console.log('Admin WS closed');
      };

      // Refresh displayed frames at ~10fps
      interval = setInterval(() => {
        const updated = {};
        for (const [email, info] of Object.entries(liveFramesRef.current)) {
          updated[email] = { frame: info, active: true };
        }
        setLiveFeeds(prev => {
          const merged = { ...prev };
          for (const [email, val] of Object.entries(updated)) {
            merged[email] = { ...merged[email], ...val };
          }
          return merged;
        });
      }, 100);

      return () => {
        clearInterval(interval);
        ws.close();
      };
    }
    return () => clearInterval(interval);
  }, [activeTab]);



  // ---------- Helpers ----------
  const persist = (qs) => {
    setQuestions(qs);
    localStorage.setItem('ifa_questions', JSON.stringify(qs));
  };

  const saveQuestion = () => {
    if (!form.text.trim()) return alert('Question text is required.');
    if (form.type === 'mcq' && form.options.some(o => !o.trim())) return alert('Fill all MCQ options.');
    if ((form.type === 'text' || form.type === 'code') && !form.answer.trim()) return alert('Correct answer is required.');

    let updated;
    if (editing === 'new') {
      updated = [...questions, { ...form, id: Date.now() }];
    } else {
      updated = questions.map(q => q.id === editing.id ? { ...form, id: editing.id } : q);
    }
    persist(updated);
    setEditing(null);
    setForm(EMPTY_Q);
  };

  const deleteQ = (id) => {
    if (!confirm('Delete this question?')) return;
    persist(questions.filter(q => q.id !== id));
  };

  const toggleEnabled = (id) => {
    persist(questions.map(q => q.id === id ? { ...q, enabled: !q.enabled } : q));
  };

  const startEdit = (q) => {
    setEditing(q);
    setForm({ text: q.text, type: q.type || 'mcq', options: q.options || ['', '', '', ''], correct: q.correct ?? 0, answer: q.answer || '', difficulty: q.difficulty || 'medium', enabled: q.enabled !== false });
  };

  const saveCodingTime = () => {
    localStorage.setItem('ifa_coding_time', codingTime);
    setTimeSaved(true);
    setTimeout(() => setTimeSaved(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-8 h-8 text-black" />
        <div>
          <h1 className="text-3xl font-bold text-black">Admin Panel</h1>
          <p className="text-sm text-gray-400">Manage questions and test settings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Questions', value: questions.length },
          { label: 'Active Questions', value: questions.filter(q => q.enabled !== false).length },
          { label: 'Coding Timer', value: `${codingTime}s` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-2xl font-bold text-black">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {['questions', 'settings', 'results', 'resumes', 'interviews', 'live'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer capitalize ${activeTab === t ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'questions' ? 'Manage Questions' : t === 'settings' ? 'Timer Settings' : t === 'results' ? 'Test Results' : t === 'resumes' ? 'Resumes' : t === 'interviews' ? '🎥 Interviews' : '🔴 Live Monitor'}
          </button>
        ))}
      </div>

      {/* QUESTIONS TAB */}
      {activeTab === 'questions' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{questions.length} question(s) in question bank</p>
            <button onClick={() => { setEditing('new'); setForm(EMPTY_Q); }}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors cursor-pointer">
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>

          {/* Question Table */}
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Question</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Difficulty</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {questions.map((q, i) => (
                  <tr key={q.id} className={`hover:bg-gray-50 transition-colors ${q.enabled === false ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-xs">
                      <p className="truncate font-medium">{q.text}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${q.type === 'code' ? 'bg-purple-100 text-purple-700' : q.type === 'text' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {TYPE_LABELS[q.type] || 'MCQ'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${DIFF_COLORS[q.difficulty || 'medium']}`}>
                        {q.difficulty || 'medium'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleEnabled(q.id)} className="cursor-pointer">
                        {q.enabled !== false
                          ? <ToggleRight className="w-6 h-6 text-green-500" />
                          : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(q)} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteQ(q.id)} className="p-1.5 rounded-lg hover:bg-red-50 cursor-pointer text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {questions.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No questions yet. Click "Add Question" to begin.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="max-w-md">
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-black" />
              <h2 className="text-xl font-bold text-black">Coding Question Timer</h2>
            </div>

            <p className="text-sm text-gray-500 mb-4">Set the time limit applied to all coding-type questions for users. This updates instantly for all users.</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {CODING_TIMES.map(t => (
                <button key={t} onClick={() => setCodingTime(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${codingTime === t ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>
                  {t}s {t === 60 ? '(default)' : ''}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <input
                type="number"
                value={codingTime}
                min={10}
                max={600}
                onChange={e => setCodingTime(parseInt(e.target.value) || 60)}
                className="w-28 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-black transition-colors"
              />
              <span className="text-sm text-gray-500">seconds (custom)</span>
            </div>

            <button onClick={saveCodingTime}
              className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors cursor-pointer">
              <Save className="w-4 h-4" />
              {timeSaved ? 'Saved ✓' : 'Save Timer Setting'}
            </button>
          </div>
        </div>
      )}

      {/* RESULTS TAB - Three separate topic tables */}
      {activeTab === 'results' && (() => {
        // Categorize results by question type
        const mcqResults = results.filter(r => !r.type || r.type === 'test' || r.type === 'mcq');
        const textResults = results.filter(r => r.type === 'text');
        const codeResults = results.filter(r => r.type === 'code');

        // Helper: count questions solved (not skipped) per type
        const countSolved = (res, qType) => {
          if (!res.answers || !Array.isArray(res.answers)) {
            // answers might be an object {0: val, 1: val}
            if (res.answers && typeof res.answers === 'object') {
              return Object.values(res.answers).filter(a => a !== null && a !== undefined && a !== '' && a !== -1).length;
            }
            return res.correctCount || 0;
          }
          return res.answers.filter(a => a !== null && a !== undefined && a !== '' && a !== -1).length;
        };

        const TopicTable = ({ title, icon, color, borderColor, headerBg, data, emptyMsg }) => (
          <div className={`border-2 ${borderColor} rounded-2xl overflow-hidden shadow-sm mb-6`}>
            {/* Table Header */}
            <div className={`${headerBg} px-6 py-4 flex items-center gap-3`}>
              <span className="text-2xl">{icon}</span>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{data.length} record(s) found</p>
              </div>
              <div className="ml-auto">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${color}`}>
                  {data.length} Users
                </span>
              </div>
            </div>

            {data.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm bg-white">
                <p className="text-2xl mb-2">📭</p>
                {emptyMsg}
              </div>
            ) : (
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">#</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Login ID (Email)</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Date</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Time</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">⏱ Seconds to Solve</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">✅ Questions Solved</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Score %</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.map((res, i) => {
                      const dateObj = new Date(res.timestamp);
                      const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                      const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      const solved = countSolved(res);
                      const isPassed = res.percentage >= 70;
                      return (
                        <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3.5 text-gray-400 font-mono text-xs">{i + 1}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                                {(res.userEmail || 'U')[0].toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-800 text-xs">{res.userEmail || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-600 text-xs font-medium">{dateStr}</td>
                          <td className="px-4 py-3.5 text-gray-500 text-xs font-mono">{timeStr}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-extrabold text-gray-900">{res.timeTaken || 0}</span>
                              <span className="text-xs text-gray-400">sec</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-bold text-gray-900">{solved}</span>
                              <span className="text-xs text-gray-400">/ {res.totalQuestions || 0}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-sm font-extrabold ${res.percentage >= 70 ? 'text-green-600' : res.percentage >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
                              {res.percentage}%
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {isPassed ? '✓ PASS' : '✗ FAIL'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              className="text-xs font-semibold text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer"
                              onClick={() => alert(JSON.stringify(res.answers, null, 2))}
                            >
                              View Answers
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Test Results — Topic-wise</h2>
              <span className="text-sm text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg font-medium">
                Total Records: {results.length}
              </span>
            </div>

            {/* Adaptive Assessment Analytics Summary */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 mb-8 text-white shadow-lg">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Monitor className="w-5 h-5"/> AI Adaptive Analytics</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-3xl font-extrabold">{results.filter(r => r.percentage >= 70).length}</p>
                  <p className="text-sm opacity-80 mt-1">Candidates Promoted (Hard Difficulty)</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold">{results.filter(r => r.percentage < 40).length}</p>
                  <p className="text-sm opacity-80 mt-1">Remedial Path (Easy Difficulty)</p>
                </div>
                <div>
                  <p className="text-3xl font-extrabold">{results.length > 0 ? Math.round(results.reduce((a, b) => a + (b.percentage || 0), 0) / results.length) : 0}%</p>
                  <p className="text-sm opacity-80 mt-1">Ecosystem Average Score</p>
                </div>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                <p className="text-4xl mb-3">📊</p>
                <p className="font-semibold">No results found yet.</p>
                <p className="text-sm mt-1">Results will appear here after users complete tests.</p>
              </div>
            ) : (
              <>
                {/* MCQ Table */}
                <TopicTable
                  title="MCQ — Multiple Choice Results"
                  icon="📝"
                  color="bg-blue-100 text-blue-700"
                  borderColor="border-blue-100"
                  headerBg="bg-blue-50"
                  data={mcqResults}
                  emptyMsg="No MCQ results yet."
                />

                {/* Text / Written Table */}
                <TopicTable
                  title="Written — Text Answer Results"
                  icon="✍️"
                  color="bg-purple-100 text-purple-700"
                  borderColor="border-purple-100"
                  headerBg="bg-purple-50"
                  data={textResults}
                  emptyMsg="No written/text results yet."
                />

                {/* Code Table */}
                <TopicTable
                  title="Coding — Programming Results"
                  icon="💻"
                  color="bg-emerald-100 text-emerald-700"
                  borderColor="border-emerald-100"
                  headerBg="bg-emerald-50"
                  data={codeResults}
                  emptyMsg="No coding results yet."
                />
              </>
            )}
          </div>
        );
      })()}

      {/* RESUMES TAB */}
      {activeTab === 'resumes' && (() => {
        return (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">📄 Resume Analysis Results</h2>
                <p className="text-sm text-gray-400 mt-0.5">AI-powered resume assessments submitted by users</p>
              </div>
              <span className="text-sm text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg font-medium">
                {resumes.length} Resume(s) on file
              </span>
            </div>

            {resumes.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                <p className="text-4xl mb-3">📭</p>
                <p className="font-semibold">No resume submissions yet.</p>
                <p className="text-sm mt-1">Results will appear here after users upload and analyze their resumes.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {resumes.map((res, i) => {
                  const analysis = res.analysis || {};
                  const stats = analysis.stats || {};
                  const checklist = analysis.checklist || {};
                  const score = res.score || analysis.score || 0;
                  const badge = analysis.badge || (score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Average');
                  const badgeColor = badge === 'Excellent' ? 'bg-emerald-100 text-emerald-700' : badge === 'Good' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700';
                  const scoreColor = score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-orange-500' : 'text-red-500';
                  const isExpanded = expandedResume === (res._id || i);
                  const checklistPassed = Object.values(checklist).filter(Boolean).length;
                  const checklistTotal = Object.keys(checklist).length;

                  return (
                    <div key={res._id || i} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                      {/* Card Header — always visible */}
                      <div
                        className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50/60 transition-colors"
                        onClick={() => setExpandedResume(isExpanded ? null : (res._id || i))}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Avatar */}
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm">
                            {(res.userEmail || 'U')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{res.userEmail}</p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                              {res.role || 'Role not detected'} · Updated {new Date(res.lastUpdated).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        {/* Right Side Stats */}
                        <div className="flex items-center gap-5 shrink-0 ml-4">
                          {/* ATS Score */}
                          <div className="text-center">
                            <p className={`text-2xl font-extrabold ${scoreColor}`}>{score}%</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">ATS Score</p>
                          </div>
                          {/* Badge */}
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${badgeColor}`}>{badge}</span>
                          {/* Readability */}
                          <div className="text-center hidden md:block">
                            <p className="text-lg font-bold text-blue-600">{analysis.readability || 0}%</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Readability</p>
                          </div>
                          {/* Checklist */}
                          <div className="text-center hidden md:block">
                            <p className="text-lg font-bold text-purple-600">{checklistPassed}/{checklistTotal}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Checklist</p>
                          </div>
                          {/* Expand arrow */}
                          <svg className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>

                      {/* Expanded Detail Panel */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50/40 p-5 space-y-5">

                          {/* Stats Row */}
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                            {[
                              { label: 'Words', value: stats.words || 0 },
                              { label: 'Pages', value: stats.pages || 0 },
                              { label: 'Skills', value: stats.skillsCount || (res.skills?.length || 0) },
                              { label: 'Projects', value: stats.projects || 0 },
                              { label: 'Certifications', value: stats.certifications || 0 },
                              { label: 'Exp (Yrs)', value: stats.experienceYears || 0 },
                            ].map(({ label, value }) => (
                              <div key={label} className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
                                <p className="text-xl font-extrabold text-gray-800">{value}</p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">{label}</p>
                              </div>
                            ))}
                          </div>

                          {/* Skills List */}
                          {res.skills && res.skills.length > 0 && (
                            <div className="bg-white rounded-xl p-4 border border-gray-100">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Skills Detected</p>
                              <div className="flex flex-wrap gap-2">
                                {res.skills.map((skill, si) => (
                                  <span key={si} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">{skill}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Analysis Grid — Strengths / Weaknesses / Missing Skills / ATS */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analysis.analysis?.strengths?.length > 0 && (
                              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">✅ Strengths</p>
                                <ul className="space-y-1.5">
                                  {analysis.analysis.strengths.map((s, si) => (
                                    <li key={si} className="text-xs text-emerald-800 flex gap-2"><span className="shrink-0 mt-0.5">•</span>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysis.analysis?.weaknesses?.length > 0 && (
                              <div className="bg-red-50/60 border border-red-100 rounded-xl p-4">
                                <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">⚠️ Weaknesses</p>
                                <ul className="space-y-1.5">
                                  {analysis.analysis.weaknesses.map((w, wi) => (
                                    <li key={wi} className="text-xs text-red-700 flex gap-2"><span className="shrink-0 mt-0.5">•</span>{w}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysis.analysis?.missingSkills?.length > 0 && (
                              <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
                                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">🎯 Missing Skills</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {analysis.analysis.missingSkills.map((ms, msi) => (
                                    <span key={msi} className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{ms}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {analysis.analysis?.ats?.length > 0 && (
                              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">🤖 ATS / Formatting</p>
                                <ul className="space-y-1.5">
                                  {analysis.analysis.ats.map((a, ai) => (
                                    <li key={ai} className="text-xs text-blue-800 flex gap-2"><span className="shrink-0 mt-0.5">•</span>{a}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Checklist */}
                          {Object.keys(checklist).length > 0 && (
                            <div className="bg-white rounded-xl p-4 border border-gray-100">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Resume Checklist ({checklistPassed}/{checklistTotal} passed)</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(checklist).map(([key, val]) => (
                                  <div key={key} className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold capitalize ${val ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                    <span>{val ? '✓' : '✗'}</span>{key}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Job Matches */}
                          {analysis.jobMatches?.length > 0 && (
                            <div className="bg-white rounded-xl p-4 border border-gray-100">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Top Job Matches</p>
                              <div className="space-y-2">
                                {analysis.jobMatches.map((jm, ji) => (
                                  <div key={ji} className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-gray-700 w-40 shrink-0 truncate">{jm.title}</span>
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${jm.percentage}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-indigo-600 w-10 text-right">{jm.percentage}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ADD/EDIT MODAL */}
      {activeTab === 'interviews' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{interviewSessions.length} interview session(s) recorded</p>
          </div>
          {interviewSessions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🎥</p>
              <p className="font-medium">No interview sessions yet.</p>
              <p className="text-sm mt-1">Sessions will appear here after users complete interviews.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviewSessions.map((session) => (
                <div key={session._id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                  {/* Session Header */}
                  <div
                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedSession(expandedSession === session._id ? null : session._id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {(session.userEmail || 'A')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{session.userEmail}</p>
                        <p className="text-xs text-gray-400">{new Date(session.completedAt).toLocaleString()} · {session.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-blue-600">{session.analysis?.scores?.total ?? '—'}%</p>
                        <p className="text-xs text-gray-400">Score</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-amber-500">{session.fillerWordsCount ?? 0}</p>
                        <p className="text-xs text-gray-400">Fillers</p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSession === session._id ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedSession === session._id && (
                    <div className="border-t border-gray-100 p-5 space-y-5 bg-gray-50/50">
                      {/* Score Cards */}
                      <div className="grid grid-cols-4 gap-3">
                        {[['Total', session.analysis?.scores?.total, 'blue'], ['Confidence', session.analysis?.scores?.confidence, 'purple'], ['Clarity', session.analysis?.scores?.clarity, 'emerald'], ['Eye Contact', session.analysis?.scores?.eyeContact, 'amber']].map(([label, val, color]) => (
                          <div key={label} className="bg-white rounded-xl p-3 text-center border border-gray-100">
                            <p className={`text-xl font-extrabold text-${color}-600`}>{val ?? '—'}%</p>
                            <p className="text-xs text-gray-500 mt-1">{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* AI Summary */}
                      {session.analysis?.summary && (
                        <div className="rounded-xl p-4 border bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">AI Summary</p>
                          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{session.analysis.summary}</p>
                        </div>
                      )}

                      {/* Q&A Transcripts */}
                      <div className="rounded-xl p-4 border bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Transcribed Answers</p>
                        <div className="space-y-3">
                          {(session.questions || []).map((q, i) => (
                            <div key={i} className="pb-3 border-b last:border-0 border-gray-50 dark:border-gray-700">
                              <p className="font-semibold text-sm mb-1 text-gray-800 dark:text-gray-200">Q{i + 1}: {q}</p>
                              <p className="text-sm text-gray-500 italic">"{session.answers?.[i] || 'No response'}"</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Video */}
                      <div className="rounded-xl p-4 border bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Interview Recording</p>
                        {session.videoUrl ? (
                          <video
                            src={session.videoUrl}
                            controls
                            className="w-full max-w-xl rounded-xl"
                          />
                        ) : (
                          <p className="text-sm text-gray-400 italic">No recording available for this session.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIVE MONITOR TAB */}
      {activeTab === 'live' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <p className="text-sm font-semibold text-gray-800">Live Proctoring Monitor</p>
              {/* WS Connection Status Badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                wsStatus === 'connected' ? 'bg-green-100 text-green-700' :
                wsStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
                wsStatus === 'error' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {wsStatus === 'connected' ? '✓ Server Connected' :
                 wsStatus === 'connecting' ? '⟳ Connecting...' :
                 wsStatus === 'error' ? '✗ Cannot reach backend server (ws://127.0.0.1:5000)' :
                 '— Disconnected'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{Object.keys(liveFeeds).filter(e => liveFeeds[e].active).length} candidate(s) live</p>
          </div>

          {wsStatus === 'error' && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <p className="font-bold mb-1">❌ Backend Connection Failed</p>
              <p>Make sure the backend server is running: <code className="bg-red-100 px-1 py-0.5 rounded">node server.js</code> inside the <code className="bg-red-100 px-1 py-0.5 rounded">backend/</code> folder.</p>
            </div>
          )}

          {Object.keys(liveFeeds).length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
              <div className="text-5xl mb-3">📡</div>
              <p className="font-semibold text-gray-500">No active sessions</p>
              <p className="text-sm text-gray-400 mt-1">Live feeds will appear here when candidates start their assessment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(liveFeeds).map(([email, info]) => (
                <div key={email} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                  {/* Feed Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                        {(email || 'A')[0].toUpperCase()}
                      </div>
                      <p className="text-xs font-semibold text-gray-800 truncate">{email}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${info.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${info.active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      {info.active ? 'LIVE' : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Live Frame */}
                  <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                    {info.frame ? (
                      <img
                        src={info.frame}
                        alt={`Live feed: ${email}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-gray-500">
                        <Monitor className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-xs opacity-50">{info.active ? 'Waiting for feed...' : 'Session ended'}</p>
                      </div>
                    )}
                    {info.active && (
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        <span className="text-[9px] text-white font-bold uppercase tracking-wider">REC</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {editing !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-4">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold">{editing === 'new' ? 'Add New Question' : 'Edit Question'}</h2>
                <button onClick={() => setEditing(null)} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Question Text */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Question Text</label>
                  <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                    placeholder="Enter question..." rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors resize-none" />
                </div>

                {/* Type + Difficulty row */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors bg-white cursor-pointer">
                      <option value="mcq">MCQ (Multiple Choice)</option>
                      <option value="text">Text (Open-ended)</option>
                      <option value="code">Code (Programming)</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 block mb-1">Difficulty</label>
                    <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors bg-white cursor-pointer">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* MCQ Options */}
                {form.type === 'mcq' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Options <span className="text-gray-400 font-normal">(select correct answer)</span></label>
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input type="radio" name="correct" checked={form.correct === i}
                          onChange={() => setForm(f => ({ ...f, correct: i }))} className="cursor-pointer" />
                        <input value={opt} onChange={e => setForm(f => { const options = [...f.options]; options[i] = e.target.value; return { ...f, options }; })}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-black transition-colors" />
                        {form.correct === i && <span className="text-xs text-green-600 font-semibold whitespace-nowrap">✓ Correct</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Text/Code Answer */}
                {(form.type === 'text' || form.type === 'code') && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      {form.type === 'code' ? 'Expected Answer / Approach' : 'Correct Answer'}
                    </label>
                    <textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                      placeholder={form.type === 'code' ? 'e.g., Use a for loop to iterate...' : 'Expected answer...'}
                      rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors font-mono resize-none" />
                  </div>
                )}

                {/* Enabled toggle */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <span className="text-sm font-medium text-gray-700">Active (visible to users)</span>
                  <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))} className="cursor-pointer">
                    {form.enabled ? <ToggleRight className="w-7 h-7 text-green-500" /> : <ToggleLeft className="w-7 h-7 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button onClick={saveQuestion} className="px-4 py-2 rounded-lg text-sm bg-black text-white hover:bg-gray-800 cursor-pointer flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Question
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
