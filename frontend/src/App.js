// src/App.js
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './utils/ThemeContext';
import { Router } from './utils/Router';
import LandingPage from './pages/LandingPage';
import IdeaInputPage from './pages/IdeaInputPage';
import DashboardPage from './pages/DashboardPage';
import PitchPreviewPage from './pages/PitchPreviewPage';
import HistoryPage from './pages/HistoryPage';
import { mockDashboardData } from './utils/mockData';

const App = () => {
  const [isDark, setIsDark] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [formData, setFormData] = useState({
    name: '',
    problem: '',
    solution: '',
    audience: '',
    usp: '',
    domain: '',
    summary: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const navigate = (path) => {
    setCurrentPath(path);
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const renderPage = () => {
    switch (currentPath) {
      case '/':
        return <LandingPage navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />;
      case '/start':
        return <IdeaInputPage navigate={navigate} formData={formData} setFormData={setFormData} isLoading={isLoading} setIsLoading={setIsLoading} isDark={isDark} toggleTheme={toggleTheme} />;
      case '/dashboard':
        return <DashboardPage navigate={navigate} data={mockDashboardData} isDark={isDark} toggleTheme={toggleTheme} />;
      case '/pitch-preview':
        return <PitchPreviewPage navigate={navigate} data={mockDashboardData} isDark={isDark} toggleTheme={toggleTheme} />;
      case '/my-plans':
        return <HistoryPage navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />;
      default:
        return <LandingPage navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />;
    }
  };

  return (
    <ThemeProvider value={{ isDark, toggleTheme }}>
      <div className={`min-h-screen transition-colors ${isDark ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        {renderPage()}
      </div>
    </ThemeProvider>
  );
};

export default App;