import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function RegisterForm({ onSuccess }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Enter a valid email address.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');

    const result = await register(form.name, form.email.trim(), form.password);
    if (result.success) {
      setSuccess(true);
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }
    } else {
      setError(result.error);
    }
  };

  if (success) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-gray-700 font-semibold text-lg">Account created!</p>
        <p className="text-gray-500 text-sm mt-1">Redirecting...</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {[
        { label: 'Full Name', field: 'name', type: 'text', placeholder: 'John Doe' },
        { label: 'Email', field: 'email', type: 'email', placeholder: 'you@example.com' },
        { label: 'Password', field: 'password', type: 'password', placeholder: '••••••••' },
        { label: 'Confirm Password', field: 'confirm', type: 'password', placeholder: '••••••••' },
      ].map(({ label, field, type, placeholder }) => (
        <div key={field}>
          <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
          <input
            type={type}
            value={form[field]}
            onChange={set(field)}
            required
            placeholder={placeholder}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors"
          />
        </div>
      ))}

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-600 text-sm bg-red-50 border border-red-100 px-4 py-2 rounded-lg">
          {error}
        </motion.p>
      )}

      <button type="submit" className="bg-black text-white rounded-xl py-3 font-semibold text-sm hover:bg-gray-800 transition-colors cursor-pointer mt-1">
        Create Account
      </button>
    </form>
  );
}
