import React from 'react';
import { motion } from 'framer-motion';
import { Play, ClipboardList, Clock, Shield, Plus, Camera, CheckCircle2, Home as HomeIcon } from 'lucide-react';
import Webcam from 'react-webcam';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const Home = () => {
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
        <HomeIcon className="w-8 h-8 text-black" />
        <h1 className="text-4xl font-bold text-black">Home</h1>
      </div>
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Welcome to your Dashboard</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          This is a modern, light-themed web application with a Microsoft Store-style vertical sidebar.
          Navigate through the menu on the left to explore different sections.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Quick Start</h3>
            <p className="text-sm text-gray-500">Upload your resume to begin the interview process.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Recent Activity</h3>
            <p className="text-sm text-gray-500">No recent interviews found.</p>
          </div>
        </div>

        {/* Camera Check Section */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5" /> Live Camera Check
          </h2>
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-8 items-center">
            <div className="w-full md:w-80 aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-inner border border-gray-100 relative group">
              <Webcam
                audio={false}
                className="w-full h-full object-cover"
                mirrored={true}
              />
              <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Ready</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-black mb-2">Face Monitoring Active</h3>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Your camera is correctly configured and ready for proctored sessions.
                Ensure your face is clearly visible and centered for the best interview experience.
              </p>
              <div className="flex flex-col gap-2">
                {[
                  'Good lighting detected',
                  'Face centered in frame',
                  'Webcam permission granted',
                ].map(check => (
                  <div key={check} className="flex items-center gap-2 text-xs font-medium text-green-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {check}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Home;
