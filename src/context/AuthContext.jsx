import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Default users (admin + regular user)
const DEFAULT_USERS = [
  { id: 1, name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' },
  { id: 2, name: 'User', email: 'user@test.com', password: 'user123', role: 'user' },
];

const DEFAULT_QUESTIONS = [
  { id: 1, text: 'What is React?', type: 'mcq', options: ['A JS library', 'A database', 'A server', 'A language'], correct: 0, difficulty: 'easy', enabled: true },
  { id: 2, text: 'What hook manages state in React?', type: 'mcq', options: ['useEffect', 'useState', 'useRef', 'useMemo'], correct: 1, difficulty: 'easy', enabled: true },
  { id: 3, text: 'What does CSS stand for?', type: 'mcq', options: ['Cascading Style Sheets', 'Computer Style System', 'Creative Style Scripts', 'Code Style Sheets'], correct: 0, difficulty: 'easy', enabled: true },
  { id: 4, text: 'Which company created React?', type: 'mcq', options: ['Google', 'Microsoft', 'Meta', 'Apple'], correct: 2, difficulty: 'medium', enabled: true },
  { id: 5, text: 'What does HTML stand for?', type: 'mcq', options: ['Hyper Text Markup Language', 'High Tech Modern Layout', 'Hyper Transfer Markup Loader', 'Home Tool Markup Language'], correct: 0, difficulty: 'easy', enabled: true },
  { id: 6, text: 'Explain the difference between let, const, and var in JavaScript.', type: 'text', answer: 'var is function-scoped; let and const are block-scoped. const cannot be reassigned.', difficulty: 'medium', enabled: true },
  { id: 7, text: 'What is the virtual DOM in React and why is it important?', type: 'text', answer: 'A lightweight JS copy of the real DOM used for efficient diffing and batching updates.', difficulty: 'medium', enabled: true },
  { id: 8, text: 'Write a function to reverse a string in JavaScript.', type: 'code', answer: `function reverseString(str) {
  return str.split('').reverse().join('');
}`, difficulty: 'easy', enabled: true },
  { id: 9, text: 'Write a function that checks if a number is prime.', type: 'code', answer: `function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
}`, difficulty: 'hard', enabled: true },
  { id: 10, text: 'Write a function to find the longest word in a sentence.', type: 'code', answer: `function longestWord(sentence) {
  return sentence.split(' ').reduce((a, b) => a.length >= b.length ? a : b);
}`, difficulty: 'medium', enabled: true },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('ifa_user');
    return stored ? JSON.parse(stored) : null;
  });

  // Seed default users and questions
  useEffect(() => {
    if (!localStorage.getItem('ifa_questions')) {
      localStorage.setItem('ifa_questions', JSON.stringify(DEFAULT_QUESTIONS));
    }
    if (!localStorage.getItem('ifa_coding_time')) {
      localStorage.setItem('ifa_coding_time', '60');
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        localStorage.setItem('ifa_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'Login failed.' };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Network error. Please try again later.' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed.' };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: 'Network error. Please try again later.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ifa_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
