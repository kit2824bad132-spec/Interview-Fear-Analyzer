import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileText, CheckCircle, XCircle, AlertTriangle, 
  Loader2, Target, PlusCircle, Briefcase, Award, Star, 
  BookOpen, Clock, Layers, FileSignature, Sparkles, Download, RefreshCw, Check, X, Palette, Moon, Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const THEMES = {
  blue: { bg: 'bg-blue-600', text: 'text-blue-600', lightBg: 'bg-blue-50', border: 'border-blue-200', hex: '#2563EB' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', lightBg: 'bg-emerald-50', border: 'border-emerald-200', hex: '#059669' },
  purple: { bg: 'bg-purple-600', text: 'text-purple-600', lightBg: 'bg-purple-50', border: 'border-purple-200', hex: '#7C3AED' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-500', lightBg: 'bg-orange-50', border: 'border-orange-200', hex: '#F97316' }
};

const CircularProgress = ({ value, label, size = 120, strokeWidth = 10, color = "#2563EB", isDark }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - ((value || 0) / 100) * circumference;
  
  return (
    <div className="relative flex flex-col items-center justify-center mb-6" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke={isDark ? "#374151" : "#EFF6FF"} strokeWidth={strokeWidth} fill="none" />
        <motion.circle 
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" 
          strokeDasharray={circumference} strokeLinecap="round" 
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value || 0}</span>
      </div>
      {label && <span className="absolute -bottom-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, colorTheme, isDark }) => (
  <motion.div whileHover={{ y: -2 }} className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all`}>
    <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-gray-700' : colorTheme.lightBg} flex items-center justify-center shrink-0`}>
      <Icon className={`w-5 h-5 ${colorTheme.text}`} />
    </div>
    <div>
      <p className={`text-xs font-medium mb-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  </motion.div>
);

const SectionList = ({ title, items, icon: Icon, colorClass, bgClass, borderClass, isDark }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : `${bgClass} ${borderClass}`}`}>
      <div className={`flex items-center gap-2 mb-4 ${colorClass}`}>
        <Icon className="w-5 h-5" />
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className={`flex items-start gap-3 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span className={`mt-1 shrink-0 w-1.5 h-1.5 rounded-full ${colorClass.replace('text-', 'bg-')}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const Resume = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [fileObj, setFileObj] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [progress, setProgress] = useState(0);
  
  // Theme State
  const [isDark, setIsDark] = useState(false);
  const [accent, setAccent] = useState('blue');
  const theme = THEMES[accent];

  useEffect(() => {
    async function loadStoredProfile() {
      if (!user?.email) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/admin/users`);
        if (res.ok) {
           const users = await res.json();
           const currentUser = users.find(u => u.userEmail === user.email);
           if (currentUser && currentUser.analysis && typeof currentUser.analysis === 'object' && !Array.isArray(currentUser.analysis)) {
             setAnalysisResult(currentUser.analysis);
           }
        }
      } catch (err) { console.error("Persistence Load Error:", err); }
    }
    loadStoredProfile();
  }, [user]);

  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setProgress(p => (p >= 95 ? 95 : p + 5));
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isAnalyzing]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileObj(e.target.files[0]);
      setFileName(e.target.files[0].name);
      setAnalysisResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.stopPropagation();
    if (!fileObj) {
      fileInputRef.current?.click();
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const formData = new FormData();
      formData.append('resume', fileObj);
      if (user?.email) {
        formData.append('email', user.email);
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/extract-resume`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || "API Failure");
      }
    } catch (error) {
      console.error("Analysis Failed:", error);
      alert("Analysis failed: " + error.message);
    } finally {
      setProgress(100);
      setTimeout(() => setIsAnalyzing(false), 500);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-[1400px] mx-auto w-full px-4 py-8">
        
        {/* HEADER & THEME TOGGLE */}
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b pb-6 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <div>
            <h1 className="text-3xl font-extrabold mb-2">Resume Dashboard</h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>AI-powered insights to land your dream job.</p>
          </div>
          
          <div className="flex flex-col items-end gap-4 mt-4 md:mt-0">
            {/* Theme Controls */}
            <div className={`flex items-center gap-3 px-4 py-2 rounded-full border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
              <button onClick={() => setIsDark(!isDark)} className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDark ? 'text-yellow-400' : 'text-gray-600'}`}>
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
              {Object.keys(THEMES).map(key => (
                <button 
                  key={key} onClick={() => setAccent(key)}
                  className={`w-5 h-5 rounded-full transition-transform ${accent === key ? 'scale-125 ring-2 ring-offset-2 ring-offset-transparent ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: THEMES[key].hex }}
                />
              ))}
            </div>

            {analysisResult && (
              <div className="flex gap-3">
                <button onClick={() => window.print()} className={`flex items-center gap-2 border px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm ${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <Download className="w-4 h-4" /> Export Report
                </button>
                <button onClick={() => setAnalysisResult(null)} className={`flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm ${theme.bg} hover:opacity-90`}>
                  <RefreshCw className="w-4 h-4" /> Analyze Another
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Upload Area */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div 
              className={`rounded-3xl p-8 border-2 border-dashed flex flex-col items-center justify-center text-center transition-all duration-300 relative overflow-hidden ${
                isAnalyzing ? `${theme.border} ${theme.lightBg} bg-opacity-30` : 
                fileName ? 'border-emerald-200 bg-emerald-50/10' : 
                `${isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-400'} cursor-pointer`
              }`}
              onClick={() => { if(!isAnalyzing) fileInputRef.current?.click(); }}
              style={{ minHeight: '320px' }}
            >
              {isAnalyzing && (
                <div className={`absolute inset-0 backdrop-blur-sm flex flex-col items-center justify-center z-10 ${isDark ? 'bg-gray-900/80' : 'bg-white/80'}`}>
                  <Loader2 className={`w-12 h-12 animate-spin mb-4 ${theme.text}`} />
                  <p className={`text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Analyzing Resume...</p>
                  <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div className={`h-full ${theme.bg} rounded-full`} animate={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-colors ${fileName ? 'bg-emerald-100 text-emerald-600' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                {fileName ? <FileSignature className="w-10 h-10" /> : <Upload className="w-10 h-10" />}
              </div>

              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {fileName ? "Document Selected" : "Drag & Drop your Resume"}
              </h3>
              <p className={`text-sm mb-8 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {fileName ? fileName : "Supports PDF and DOCX (Maximum 5 MB)"}
              </p>
              
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx" onChange={handleFileChange} disabled={isAnalyzing} />
              
              <button 
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                  isAnalyzing ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700' : 
                  fileName ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : `${theme.bg} text-white hover:opacity-90`
                }`}
                onClick={handleUpload} disabled={isAnalyzing}
              >
                {fileName ? "Start AI Assessment" : "Browse Files"}
              </button>
            </div>

            {/* Educational / Promo Card */}
            {!analysisResult && !isAnalyzing && (
              <div className={`rounded-3xl p-8 text-white shadow-lg ${theme.bg}`}>
                <Sparkles className="w-8 h-8 mb-4 opacity-80" />
                <h3 className="text-lg font-bold mb-2">Why use AI Analysis?</h3>
                <p className="text-sm leading-relaxed mb-6 opacity-90">Our ATS-compliant engine scans your resume against thousands of successful profiles to find exactly what you're missing.</p>
                <ul className="space-y-3 text-sm opacity-95">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-white" /> Discover missing keywords</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-white" /> Fix grammar & formatting</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-white" /> Get an instant ATS Score</li>
                </ul>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Dashboard */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {!analysisResult && !isAnalyzing && (
              <div className={`h-full border rounded-3xl flex flex-col items-center justify-center text-center p-12 shadow-sm min-h-[500px] ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <FileText className={`w-16 h-16 ${isDark ? 'text-gray-500' : 'text-gray-300'}`} />
                </div>
                <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Awaiting Resume</h2>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} max-w-sm`}>Upload a resume on the left to receive a comprehensive, AI-powered analysis report.</p>
              </div>
            )}

            {isAnalyzing && !analysisResult && (
               <div className={`h-full border rounded-3xl flex flex-col items-center justify-center text-center p-12 shadow-sm min-h-[500px] ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                 <Loader2 className={`w-12 h-12 animate-spin mb-6 ${theme.text}`} />
                 <p className={`text-lg font-bold animate-pulse ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Generating your custom report...</p>
               </div>
            )}

            {analysisResult && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                
                {/* TOP OVERVIEW CARD */}
                <div className={`border rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center gap-8 md:gap-12 relative overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20 opacity-30 pointer-events-none ${theme.bg}`} />
                  
                  <div className="shrink-0 pt-4">
                    <CircularProgress isDark={isDark} value={analysisResult.score} label="Overall Score" color={theme.hex} />
                  </div>
                  
                  <div className="flex-1 w-full relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{analysisResult.role || 'General Role'}</h2>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${theme.bg} text-white`}>
                        {analysisResult.badge || 'Evaluated'}
                      </span>
                    </div>
                    <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Your resume is looking good, but there's room for improvement before sending it to recruiters.</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Readability Score</span>
                        <span className={theme.text}>{analysisResult.readability || 0}%</span>
                      </div>
                      <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <motion.div 
                          initial={{ width: 0 }} animate={{ width: `${analysisResult.readability || 0}%` }} 
                          transition={{ duration: 1, delay: 0.5 }}
                          className={`h-full rounded-full ${theme.bg}`} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* STATS GRID */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard isDark={isDark} colorTheme={theme} icon={FileText} label="Total Words" value={analysisResult.stats?.words || 0} />
                  <StatCard isDark={isDark} colorTheme={theme} icon={Layers} label="Pages" value={analysisResult.stats?.pages || 0} />
                  <StatCard isDark={isDark} colorTheme={theme} icon={Target} label="Skills Found" value={analysisResult.stats?.skillsCount || 0} />
                  <StatCard isDark={isDark} colorTheme={theme} icon={Briefcase} label="Projects" value={analysisResult.stats?.projects || 0} />
                  <StatCard isDark={isDark} colorTheme={theme} icon={Award} label="Certifications" value={analysisResult.stats?.certifications || 0} />
                  <StatCard isDark={isDark} colorTheme={theme} icon={Clock} label="Experience (Yrs)" value={analysisResult.stats?.experienceYears || 0} />
                </div>

                {/* DETAILED ANALYSIS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SectionList isDark={isDark} title="Key Strengths" icon={CheckCircle} items={analysisResult.analysis?.strengths} bgClass="bg-emerald-50/30" borderClass="border-emerald-100" colorClass="text-emerald-500" />
                  <SectionList isDark={isDark} title="Areas for Improvement" icon={AlertTriangle} items={analysisResult.analysis?.weaknesses} bgClass="bg-red-50/30" borderClass="border-red-100" colorClass="text-red-500" />
                  <SectionList isDark={isDark} title="Missing Skills" icon={Target} items={analysisResult.analysis?.missingSkills} bgClass="bg-amber-50/30" borderClass="border-amber-100" colorClass="text-amber-500" />
                  <SectionList isDark={isDark} title="Formatting & ATS" icon={FileSignature} items={analysisResult.analysis?.ats} bgClass="bg-blue-50/30" borderClass="border-blue-100" colorClass="text-blue-500" />
                </div>

                {/* JOB MATCHES GRAPH & CHECKLIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Job Matches Chart */}
                  <div className={`border rounded-3xl p-6 shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h3 className={`font-bold text-lg mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>Job Title Matches</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysisResult.jobMatches || []} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                          <XAxis type="number" domain={[0, 100]} hide />
                          <YAxis dataKey="title" type="category" width={120} tick={{ fontSize: 12, fill: isDark ? '#9CA3AF' : '#4B5563' }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: isDark ? '#374151' : '#fff', color: isDark ? '#fff' : '#000', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={20}>
                            {(analysisResult.jobMatches || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={theme.hex} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className={`border rounded-3xl p-6 shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <h3 className={`font-bold text-lg mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>Resume Checklist</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                      {Object.entries(analysisResult.checklist || {}).map(([key, isPresent]) => (
                        <div key={key} className="flex items-center gap-2">
                          {isPresent ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-emerald-500 font-bold" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                              <X className="w-3 h-3 text-red-500 font-bold" />
                            </div>
                          )}
                          <span className={`text-sm capitalize ${isPresent ? (isDark ? 'text-gray-300' : 'text-gray-700 font-medium') : 'text-gray-500'}`}>
                            {key}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Resume;
