import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900 text-black dark:text-gray-100 font-sans transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 ml-20 p-8 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
