import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Users, Clock, Target, 
  TrendingUp, Award, BrainCircuit, Moon, Sun,
  CheckCircle2, AlertTriangle, FileText
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [testResults, setTestResults] = useState([]);
  const [interviewSessions, setInterviewSessions] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Users
        if (isAdmin) {
          const usersRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/auth/users`);
          if (usersRes.ok) setAllUsers(await usersRes.json());
        }

        // 2. Fetch Test Results
        const url = isAdmin ? `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/test-results` : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/test-results/${user?.email}`;
        const testsRes = await fetch(url);
        if (testsRes.ok) setTestResults(await testsRes.json());

        // 3. Fetch Interview Sessions
        const intRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/admin/interview-sessions`);
        if (intRes.ok) {
          const data = await intRes.json();
          setInterviewSessions(isAdmin ? data : data.filter(s => s.userEmail === user?.email));
        }

        // 4. Fetch Resumes
        const resRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/admin/users`);
        if (resRes.ok) {
          const data = await resRes.json();
          setResumes(isAdmin ? data : data.filter(r => r.userEmail === user?.email));
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchData();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  // Derived Metrics
  const totalAssessments = testResults.length + interviewSessions.length;
  
  const avgTestScore = testResults.length > 0 
    ? Math.round(testResults.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / testResults.length) 
    : 0;
    
  const totalTimeSpent = testResults.reduce((acc, curr) => acc + (curr.timeTaken || 0), 0); // in seconds
  const formattedTime = `${Math.floor(totalTimeSpent / 3600)}h ${Math.floor((totalTimeSpent % 3600) / 60)}m`;

  const uniqueUsersCount = new Set([...testResults, ...interviewSessions].map(r => r.userEmail)).size;

  // Chart Data Preparation
  // We'll map the last 7 items (or dates) for the score trend
  const trendData = testResults.slice(-10).map((r, i) => ({
    name: new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: r.percentage || 0
  }));

  const avgClarity = interviewSessions.length > 0 
    ? Math.round(interviewSessions.reduce((acc, curr) => acc + (curr.analysis?.scores?.clarity || 0), 0) / interviewSessions.length)
    : 0;

  const avgConfidence = interviewSessions.length > 0 
    ? Math.round(interviewSessions.reduce((acc, curr) => acc + (curr.analysis?.scores?.confidence || 0), 0) / interviewSessions.length)
    : 0;

  // Skills Distribution
  const skillsData = [
    { name: 'Problem Solving', value: avgTestScore > 0 ? avgTestScore : 0 },
    { name: 'Communication', value: avgClarity },
    { name: 'Technical', value: avgTestScore > 0 ? Math.min(avgTestScore + 5, 100) : 0 },
    { name: 'Confidence', value: avgConfidence }
  ];

  const recentAssessments = [...testResults, ...interviewSessions]
    .sort((a, b) => (b.timestamp || new Date(b.completedAt).getTime()) - (a.timestamp || new Date(a.completedAt).getTime()))
    .slice(0, 5);

  // Per-user stats for the Registered Users table
  const perUserStats = allUsers.map(u => {
    const userTests = testResults.filter(r => r.userEmail === u.email);
    const userInterviews = interviewSessions.filter(s => s.userEmail === u.email);
    const totalAttempts = userTests.length + userInterviews.length;
    const lastTest = userTests.sort((a, b) => b.timestamp - a.timestamp)[0];
    const lastInterview = userInterviews.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
    const lastScore = lastTest?.percentage ?? lastInterview?.analysis?.scores?.total ?? null;
    const lastDate = lastTest?.timestamp || (lastInterview ? new Date(lastInterview.completedAt).getTime() : null);
    // New: problems solved = sum of correctCount across all test attempts
    const problemsSolved = userTests.reduce((acc, r) => acc + (r.correctCount || 0), 0);
    // New: total time spent in seconds across all tests
    const totalTimeSec = userTests.reduce((acc, r) => acc + (r.timeTaken || 0), 0);
    // New: max tab switches recorded in any single attempt
    const maxTabSwitches = userTests.reduce((max, r) => Math.max(max, r.tabSwitches || 0), 0);
    return { ...u, totalAttempts, lastScore, lastDate, problemsSolved, totalTimeSec, maxTabSwitches };
  });

  
  return (
    <div className={`min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-900`}>
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3 }}
        className="max-w-[1400px] mx-auto w-full px-4 py-8"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400`}>
              <LayoutDashboard className="w-8 h-8" />
            </div>
            <div>
              <h1 className={`text-3xl font-extrabold text-gray-900 dark:text-white`}>Analytics Dashboard</h1>
              <p className="text-gray-500 dark:text-gray-400">{isAdmin ? 'Platform-wide performance & engagement metrics' : 'Your personal career growth & assessment analytics'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
<div className={`px-4 py-2 rounded-xl text-sm font-bold tracking-wide uppercase ${isAdmin ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
              {isAdmin ? 'Admin View' : 'User View'}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Assessments', value: totalAssessments, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: isAdmin ? 'Total Users' : 'Time Spent', value: isAdmin ? uniqueUsersCount : formattedTime, icon: isAdmin ? Users : Clock, color: 'text-purple-600', bg: 'bg-purple-100' },
            { label: 'Average Score', value: avgTestScore + '%', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { label: 'Interviews Taken', value: interviewSessions.length, icon: Target, color: 'text-amber-600', bg: 'bg-amber-100' },
          ].map((kpi, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -4 }}
              className={`p-6 rounded-3xl border shadow-sm bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 flex items-center gap-5`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                <kpi.icon className="w-7 h-7" />
              </div>
              <div>
                <p className={`text-sm font-semibold mb-1 text-gray-500 dark:text-gray-400`}>{kpi.label}</p>
                <p className={`text-3xl font-extrabold text-gray-900 dark:text-white`}>{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Chart - Score Trend */}
          <div className={`lg:col-span-2 p-6 rounded-3xl border shadow-sm bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2`}>
                <TrendingUp className="w-5 h-5 text-blue-500" /> Assessment Score Trend
              </h2>
            </div>
            {trendData.length === 0 ? (
              <div className={`h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400`}>Not enough data to display trend</div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={'#2563EB'} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={'#2563EB'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={'#E5E7EB'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: '12px', color: '#111827' }}
                      itemStyle={{ color: '#2563EB', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="score" stroke={'#2563EB'} strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Secondary Chart - Skills Distribution */}
          <div className={`p-6 rounded-3xl border shadow-sm bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700`}>
            <h2 className={`text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2`}>
              <BrainCircuit className="w-5 h-5 text-purple-500" /> Skill Proficiency
            </h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillsData} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={'#E5E7EB'} />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} width={100} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: '12px', color: '#111827' }}
                    formatter={(value) => [value + '%', 'Score']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} label={{ position: 'right', fill: '#6B7280', fontSize: 12, fontWeight: 'bold', formatter: (val) => val + '%' }}>
                    {skillsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'][index % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Assessments Table */}
          <div className={`lg:col-span-2 p-6 rounded-3xl border shadow-sm overflow-hidden bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold text-gray-900 dark:text-white`}>Recent Activity</h2>
            </div>
            
            {recentAssessments.length === 0 ? (
              <div className={`text-center py-12 text-gray-500 dark:text-gray-400`}>No assessments found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider`}>
                      <th className="pb-4 font-bold">User</th>
                      <th className="pb-4 font-bold">Type</th>
                      <th className="pb-4 font-bold">Score</th>
                      <th className="pb-4 font-bold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {recentAssessments.map((item, idx) => {
                      const isInterview = !!item.completedAt;
                      const score = isInterview ? item.analysis?.scores?.total : item.percentage;
                      const date = isInterview ? item.completedAt : item.timestamp;
                      
                      return (
                        <tr key={idx} className={`group hover:bg-gray-50 dark:bg-gray-800/50 transition-colors`}>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white`}>
                                {(item.userEmail || 'A')[0].toUpperCase()}
                              </div>
                              <span className={`font-medium text-gray-900 dark:text-white text-sm`}>{item.userEmail}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isInterview ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {isInterview ? 'Interview' : 'MCQ/Code'}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`font-bold ${score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                              {score || 0}%
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`text-sm text-gray-500 dark:text-gray-400`}>
                              {new Date(date).toLocaleDateString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AI Insights Card */}
          <div className={`p-6 rounded-3xl border shadow-sm bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 flex flex-col`}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <BrainCircuit className="w-4 h-4 text-white" />
              </div>
              <h2 className={`text-xl font-bold text-gray-900 dark:text-white`}>AI Insights</h2>
            </div>
            
            <div className="space-y-4 flex-1">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-gray-700/50 border border-blue-100 dark:border-gray-600">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <h3 className={`text-sm font-bold mb-1 text-gray-900 dark:text-white`}>Strong Fundamentals</h3>
                    <p className={`text-xs leading-relaxed text-gray-500 dark:text-gray-400`}>
                      {isAdmin ? 'Users are scoring consistently high in Problem Solving sections.' : 'Your Problem Solving scores have increased by 15% over the last 3 assessments.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-gray-700/50 border border-amber-100 dark:border-gray-600">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <h3 className={`text-sm font-bold mb-1 text-gray-900 dark:text-white`}>Area of Improvement</h3>
                    <p className={`text-xs leading-relaxed text-gray-500 dark:text-gray-400`}>
                      {isAdmin ? 'System design and behavioral clarity scores remain below the 70% threshold.' : 'Your interview clarity score is at 60%. Consider practicing more mock interviews.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => window.print()}
              className={`mt-6 w-full py-3 rounded-xl font-bold text-sm text-white bg-black hover:bg-gray-800 transition-colors shadow-lg`}
            >
              Generate Full Report
            </button>
          </div>
        </div>

        {/* Registered Users Table — Admin Only */}
        {isAdmin && (
          <div className={`mt-8 p-6 rounded-3xl border shadow-sm bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-500/20">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold text-gray-900 dark:text-white`}>Registered Users</h2>
                  <p className={`text-xs text-gray-500 dark:text-gray-400`}>{allUsers.length} user(s) registered on the platform</p>
                </div>
              </div>
            </div>

            {allUsers.length === 0 ? (
              <div className={`text-center py-12 text-gray-500 dark:text-gray-400`}>No users registered yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider`}>
                      <th className="pb-4 font-bold">User</th>
                      <th className="pb-4 font-bold">Email</th>
                      <th className="pb-4 font-bold text-center">Total Assessments</th>
                      <th className="pb-4 font-bold text-center">✅ Problems Solved</th>
                      <th className="pb-4 font-bold text-center">⏱ Time (sec)</th>
                      <th className="pb-4 font-bold text-center">⚠️ Tab Switches</th>
                      <th className="pb-4 font-bold text-center">Last Score</th>
                      <th className="pb-4 font-bold">Last Active</th>
                      <th className="pb-4 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perUserStats.map((u, idx) => (
                      <tr key={idx} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        {/* Avatar + Name */}
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                              {(u.name || u.email)[0].toUpperCase()}
                            </div>
                            <span className={`font-semibold text-gray-900 dark:text-white`}>{u.name || '—'}</span>
                          </div>
                        </td>
                        {/* Email */}
                        <td className={`py-4 text-sm text-gray-500 dark:text-gray-400`}>{u.email}</td>
                        {/* Total Assessments */}
                        <td className="py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${u.totalAttempts > 0 ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400'}`}>
                            {u.totalAttempts}
                          </span>
                        </td>
                        {/* Problems Solved */}
                        <td className="py-4 text-center">
                          <span className={`inline-flex items-center gap-1 font-bold text-sm ${u.problemsSolved > 0 ? 'text-emerald-600' : 'text-gray-400 dark:text-gray-500'}`}>
                            ✅ {u.problemsSolved}
                          </span>
                        </td>
                        {/* Total Time (seconds) */}
                        <td className="py-4 text-center">
                          {u.totalTimeSec > 0 ? (
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                              {u.totalTimeSec}s
                            </span>
                          ) : (
                            <span className={`text-sm text-gray-500 dark:text-gray-400`}>—</span>
                          )}
                        </td>
                        {/* Tab Switches */}
                        <td className="py-4 text-center">
                          <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            u.maxTabSwitches === 0
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                              : u.maxTabSwitches === 1
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'
                          }`}>
                            {u.maxTabSwitches === 0 ? 'None' : `${u.maxTabSwitches}x`}
                          </span>
                        </td>
                        {/* Last Score */}
                        <td className="py-4 text-center">
                          {u.lastScore !== null ? (
                            <span className={`font-bold text-lg ${u.lastScore >= 70 ? 'text-emerald-500' : u.lastScore >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                              {u.lastScore}%
                            </span>
                          ) : (
                            <span className={`text-sm text-gray-500 dark:text-gray-400`}>No attempt</span>
                          )}
                        </td>
                        {/* Last Active */}
                        <td className={`py-4 text-sm text-gray-500 dark:text-gray-400`}>
                          {u.lastDate ? new Date(u.lastDate).toLocaleDateString() : '—'}
                        </td>
                        {/* Status */}
                        <td className="py-4 text-center">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${u.totalAttempts > 0 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                            {u.totalAttempts > 0 ? 'Active' : 'Not started'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
