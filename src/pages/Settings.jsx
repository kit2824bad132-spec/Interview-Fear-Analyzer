import React from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const Settings = () => {
  const [emailNotifications, setEmailNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

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
        <SettingsIcon className="w-8 h-8 text-black" />
        <h1 className="text-4xl font-bold text-black">Settings</h1>
      </div>
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 max-w-2xl">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Profile Preferences</h2>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
              <div>
                <h3 className="font-medium text-gray-800">Email Notifications</h3>
                <p className="text-sm text-gray-500">Receive summaries after each interview</p>
              </div>
              <div 
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${emailNotifications ? 'bg-black' : 'bg-gray-300'}`}
                onClick={() => setEmailNotifications(!emailNotifications)}
              >
                <motion.div 
                  layout
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  style={{ left: emailNotifications ? 'calc(100% - 1.25rem)' : '0.25rem' }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
              <div>
                <h3 className="font-medium text-gray-800">Dark Mode</h3>
                <p className="text-sm text-gray-500">Currently disabled by system theme</p>
              </div>
              <div 
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${darkMode ? 'bg-black' : 'bg-gray-300'}`}
                onClick={() => setDarkMode(!darkMode)}
              >
                <motion.div 
                  layout
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  style={{ left: darkMode ? 'calc(100% - 1.25rem)' : '0.25rem' }}
                />
              </div>
            </div>
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
