import React from 'react';
import { F1CarIcon } from './icons/F1CarIcon';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-900/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-700 shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <F1CarIcon className="h-10 w-10 text-red-500 mr-3" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-wider">
              <span className="text-red-500">F1</span> AI Race Strategist
            </h1>
          </div>
          <div className="text-sm text-gray-400 font-mono">
            2025 Season Simulation
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;