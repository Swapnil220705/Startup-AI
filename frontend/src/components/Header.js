import React, { useState, useRef, useEffect } from 'react';
import { Lightbulb, Moon, Sun, Menu, X, LogOut, Plus, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = ({ navigate, isDark, toggleTheme, showNavigation = false }) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsUserDropdownOpen(false);
    setIsMenuOpen(false);
    await logout();
  };

  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.trim().slice(0, 2).toUpperCase();
    }
    if (email && email.trim()) {
      return email.trim().slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'User');

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur-sm ${isDark ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo & Desktop Nav Links */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors focus:outline-none"
            >
              <Lightbulb className="w-6 h-6" />
              <span>StartupAI</span>
            </button>
            
            {showNavigation && (
              <nav className="hidden md:flex space-x-6 ml-8">
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className={`text-sm font-medium hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => navigate('/my-plans')} 
                  className={`text-sm font-medium hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                >
                  My Plans
                </button>
                <button 
                  onClick={() => navigate('/pitch-preview')} 
                  className={`text-sm font-medium hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                >
                  Pitch Deck
                </button>
              </nav>
            )}
          </div>

          {/* Desktop Right Controls */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Authenticated Desktop Actions */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center space-x-3">
                <button
                  onClick={() => navigate('/start')}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Plan</span>
                </button>

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className={`flex items-center space-x-2 py-1.5 px-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      isDark 
                        ? 'border-gray-700 hover:bg-gray-800 text-gray-200' 
                        : 'border-gray-200 hover:bg-gray-50 text-gray-800'
                    }`}
                    aria-expanded={isUserDropdownOpen}
                  >
                    {user?.picture ? (
                      <img 
                        src={user.picture} 
                        alt={displayName} 
                        className="w-6 h-6 rounded-full object-cover" 
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                        {getInitials(user?.name, user?.email)}
                      </div>
                    )}
                    <span className="max-w-[120px] truncate text-xs font-semibold">
                      {displayName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-xl border py-1.5 z-50 animate-fadeIn ${
                      isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                    }`}>
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Signed in as</p>
                        <p className="text-sm font-semibold truncate">{user?.email}</p>
                      </div>

                      <button
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          navigate('/my-plans');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        My Saved Plans
                      </button>

                      <button
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          navigate('/dashboard');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Current Dashboard
                      </button>

                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-2 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Anonymous Desktop Actions */
              <div className="hidden md:flex items-center space-x-3">
                <button
                  onClick={() => openAuthModal({
                    title: 'Sign In to StartupAI',
                    subtitle: 'Sign in to access and manage your startup plans.'
                  })}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                    isDark ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/start')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
                >
                  Get Started
                </button>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800 animate-fadeIn">
            {/* Authenticated user profile banner on mobile */}
            {isAuthenticated && (
              <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-800 flex items-center space-x-3 px-2">
                {user?.picture ? (
                  <img src={user.picture} alt={displayName} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {getInitials(user?.name, user?.email)}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
            )}

            <nav className="flex flex-col space-y-2">
              <button 
                onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }} 
                className="text-left px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 transition-colors font-medium text-sm"
              >
                Dashboard
              </button>
              <button 
                onClick={() => { navigate('/my-plans'); setIsMenuOpen(false); }} 
                className="text-left px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 transition-colors font-medium text-sm"
              >
                My Plans
              </button>
              <button 
                onClick={() => { navigate('/pitch-preview'); setIsMenuOpen(false); }} 
                className="text-left px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 transition-colors font-medium text-sm"
              >
                Pitch Deck
              </button>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex flex-col space-y-2">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => { navigate('/start'); setIsMenuOpen(false); }}
                      className="w-full text-center bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                    >
                      New Plan
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-2 py-2 text-rose-600 dark:text-rose-400 font-medium text-sm flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        openAuthModal({
                          title: 'Sign In to StartupAI',
                          subtitle: 'Sign in to access and manage your startup plans.'
                        });
                      }}
                      className="w-full text-center border border-gray-300 dark:border-gray-700 py-2 rounded-lg font-medium text-sm"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => { navigate('/start'); setIsMenuOpen(false); }}
                      className="w-full text-center bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;