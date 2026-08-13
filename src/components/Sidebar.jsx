import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Upload, Mic, Code2, LayoutDashboard, Settings, ShieldCheck, FlaskConical, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const commonItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/resume', icon: Upload, label: 'Resume' },
    { path: '/interview', icon: Mic, label: 'Interview' },
    { path: '/technical', icon: Code2, label: 'Technical' },
    { path: '/test', icon: FlaskConical, label: 'Test' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const adminExtra = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin', icon: ShieldCheck, label: 'Admin' },
  ];

  const navItems = isAdmin ? [...commonItems, ...adminExtra] : commonItems;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="fixed top-0 left-0 h-screen w-20 bg-gray-100 dark:bg-gray-800 flex flex-col items-center py-6 border-r border-gray-200 dark:border-gray-700 z-50 transition-colors duration-300">
      {/* Logo */}
      <div className="w-10 h-10 bg-black dark:bg-gray-700 rounded-xl flex items-center justify-center mb-6 shadow-sm">
        <span className="text-white dark:text-gray-100 font-bold text-xs">IFA</span>
      </div>

      <div className="flex flex-col gap-2 w-full px-3 flex-1">
        {navItems.map((item) => (
          <div key={item.path} className="relative group flex justify-center">
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `p-3 w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ease-in-out ${
                  isActive
                    ? 'bg-black dark:bg-gray-600 text-white dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </NavLink>

            {/* Tooltip */}
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 dark:bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Logout"
        className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
      >
        <LogOut className="w-5 h-5" />
        <span className="text-[10px] font-medium">Logout</span>
      </button>
    </div>
  );
};

export default Sidebar;
