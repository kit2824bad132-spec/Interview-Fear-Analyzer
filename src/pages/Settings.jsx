import React from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const Settings = () => {
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  const {
    isHighContrast,
    isLargeText,
    isTTSEnabled,
    isSTTEnabled,
    toggleHighContrast,
    toggleLargeText,
    toggleTTS,
    toggleSTT
  } = useAccessibility();

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  const renderToggle = (label, description, state, toggleFn) => (
    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4">
      <div>
        <h3 className="font-medium text-gray-800 dark:text-gray-100">{label}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div 
        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${state ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
        onClick={toggleFn}
      >
        <motion.div 
          layout
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
          style={{ left: state ? 'calc(100% - 1.25rem)' : '0.25rem' }}
        />
      </div>
    </div>
  );

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="max-w-4xl"
    >
      <div className="flex items-center gap-4 mb-8">
        <SettingsIcon className="w-8 h-8 text-black dark:text-white" />
        <h1 className="text-4xl font-bold text-black dark:text-white">Settings</h1>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-8 max-w-2xl transition-colors duration-300">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Profile Preferences</h2>
          <div className="flex flex-col gap-4 mb-8">
            {renderToggle("Email Notifications", "Receive summaries after each interview", emailNotifications, () => setEmailNotifications(!emailNotifications))}
            {renderToggle("Dark Mode", darkMode ? "Dark mode is enabled" : "Enable dark theme for the application", darkMode, () => setDarkMode(!darkMode))}
          </div>

          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Accessibility (PWD)</h2>
          <div className="flex flex-col gap-4">
            {renderToggle("High Contrast", "Enhance visual contrast for better readability", isHighContrast, toggleHighContrast)}
            {renderToggle("Large Text", "Increase the global text size", isLargeText, toggleLargeText)}
            {renderToggle("Text-To-Speech (TTS)", "Read questions and feedback aloud", isTTSEnabled, toggleTTS)}
            {renderToggle("Speech-To-Text (STT)", "Enable voice typing for answers", isSTTEnabled, toggleSTT)}
          </div>
        </div>
        <button 
          className="text-red-600 font-medium hover:text-red-700 transition-colors cursor-pointer"
          onClick={() => alert("Sign out clicked!")}
        >
          Sign Out
        </button>
      </div>
    </motion.div>
  );
};

export default Settings;
