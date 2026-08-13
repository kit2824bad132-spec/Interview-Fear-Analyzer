import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';
import RegisterForm from '../components/RegisterForm';
import { Link } from 'react-router-dom';

export default function RegisterPage() {
  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black dark:text-white">Create Account</h1>
            <p className="text-xs text-gray-400">Interview Fear Analyzer</p>
          </div>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-black dark:text-white font-semibold hover:underline">Login</Link>
        </p>
      </motion.div>
    </div>
  );
}
