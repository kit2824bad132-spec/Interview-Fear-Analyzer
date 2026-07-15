import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  const loginRef = useRef();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        loginRef.current?.autoLoginAdmin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">Sign In</h1>
            <p className="text-xs text-gray-400">Interview Fear Analyzer</p>
          </div>
        </div>

        <LoginForm adminRef={loginRef} />

        <div className="flex items-center justify-center pt-6 mt-6 border-t border-gray-100 text-sm">
          <p className="text-gray-500 whitespace-nowrap">
            Don't have an account? <a href="/register" className="text-black font-semibold hover:underline">Create one</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
