// src/components/Header.js
import React, { useState } from 'react';
import { Lightbulb, Moon, Sun, Menu, X } from 'lucide-react';

const Header = ({ navigate, isDark, toggleTheme, showNavigation = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur-sm ${isDark ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <Lightbulb className="w-6 h-6" />
              <span>StartupAI</span>
            </button>
            
            {showNavigation && (
              <nav className="hidden md:flex space-x-6 ml-8">
                <button onClick={() => navigate('/dashboard')} className={`hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Dashboard
                </button>
                <button onClick={() => navigate('/pitch-preview')} className={`hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Pitch Deck
                </button>
                <button onClick={() => navigate('/my-plans')} className={`hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  My Plans
                </button>
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {!showNavigation && (
              <button
                onClick={() => navigate('/start')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Get Started
              </button>
            )}

            {showNavigation && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {showNavigation && isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800">
            <nav className="flex flex-col space-y-3">
              <button onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }} className="text-left py-2 hover:text-indigo-600 transition-colors">
                Dashboard
              </button>
              <button onClick={() => { navigate('/pitch-preview'); setIsMenuOpen(false); }} className="text-left py-2 hover:text-indigo-600 transition-colors">
                Pitch Deck
              </button>
              <button onClick={() => { navigate('/my-plans'); setIsMenuOpen(false); }} className="text-left py-2 hover:text-indigo-600 transition-colors">
                My Plans
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;