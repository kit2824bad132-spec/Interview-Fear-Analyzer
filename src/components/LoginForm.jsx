import React, { useState, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginForm({ onSuccess, adminRef }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useImperativeHandle(adminRef, () => ({
    fillAdmin() {
      setEmail('admin@test.com');
      setPassword('admin123');
    },
    autoLoginAdmin: async () => {
      setEmail('admin@test.com');
      setPassword('admin123');
      setLoading(true);
      const result = await login('admin@test.com', 'admin123');
      setLoading(false);
      if (result.success) {
        if (onSuccess) onSuccess();
        navigate('/admin');
      } else {
        setError(result.error);
      }
    }
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      if (onSuccess) onSuccess();
      navigate(result.user.role === 'admin' ? '/admin' : '/home');
    } else {
      setError(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors pr-10"
          />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-600 text-sm bg-red-50 border border-red-100 px-4 py-2 rounded-lg">
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white rounded-xl py-2.5 font-bold text-sm tracking-tight hover:bg-gray-800 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
