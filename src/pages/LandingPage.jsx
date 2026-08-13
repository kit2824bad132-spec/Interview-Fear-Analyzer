import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';
import Modal from '../components/Modal';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null); // 'login' or 'register' or null

  return (
    <div className="min-h-screen transition-colors duration-300 bg-white dark:bg-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center px-6 max-w-lg"
      >
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center shadow-2xl">
            <BrainCircuit className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-extrabold text-black dark:text-white mb-3 tracking-tight">Interview Fear Analyzer</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg mb-10">AI-powered Interview &amp; Test System with real-time anti-cheat monitoring.</p>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setActiveModal('login')}
            className="px-8 py-3.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg"
          >
            Login
          </button>
          <button
            onClick={() => setActiveModal('register')}
            className="px-8 py-3.5 bg-white dark:bg-gray-800 text-black dark:text-white border-2 border-black rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            Create Account
          </button>
        </div>


      </motion.div>

      {/* Modals */}
      <Modal 
        isOpen={activeModal === 'login'} 
        onClose={() => setActiveModal(null)} 
        title="Welcome Back"
      >
        <LoginForm onSuccess={() => setActiveModal(null)} />
      </Modal>

      <Modal 
        isOpen={activeModal === 'register'} 
        onClose={() => setActiveModal(null)} 
        title="Create your account"
      >
        <RegisterForm onSuccess={() => setActiveModal(null)} />
      </Modal>
    </div>
  );
}
