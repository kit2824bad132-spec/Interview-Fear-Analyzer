import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Protected pages
import Home from './pages/Home';
import Resume from './pages/Resume';
import Interview from './pages/Interview';
import Technical from './pages/Technical';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import TestPage from './pages/TestPage';
import ResultPage from './pages/ResultPage';
import FaceAssessment from './pages/FaceAssessment';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public */}
        <Route path="/" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/home'} replace /> : <LandingPage />} />
        <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/home'} replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/home" replace /> : <RegisterPage />} />

        {/* Protected (user + admin) */}
        <Route path="/home" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
        <Route path="/resume" element={<ProtectedRoute><Layout><Resume /></Layout></ProtectedRoute>} />
        <Route path="/interview" element={<ProtectedRoute><Layout><Interview /></Layout></ProtectedRoute>} />
        <Route path="/technical" element={<ProtectedRoute><Layout><Technical /></Layout></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute adminOnly><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        <Route path="/test" element={<ProtectedRoute><Layout><TestPage /></Layout></ProtectedRoute>} />
        <Route path="/result" element={<ProtectedRoute><Layout><ResultPage /></Layout></ProtectedRoute>} />
        <Route path="/assessment" element={<ProtectedRoute><Layout><FaceAssessment /></Layout></ProtectedRoute>} />

        {/* Admin only */}
        <Route path="/admin" element={<ProtectedRoute adminOnly><Layout><AdminPanel /></Layout></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
