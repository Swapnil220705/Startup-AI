// src/App.js
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './utils/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Router } from './utils/Router';
import LandingPage from './pages/LandingPage';
import IdeaInputPage from './pages/IdeaInputPage';
import DashboardPage from './pages/DashboardPage';
import PitchPreviewPage from './pages/PitchPreviewPage';
import HistoryPage from './pages/HistoryPage';
import AuthModal from './components/AuthModal';
import { mockDashboardData } from './utils/mockData';

const App = () => {
  const [isDark, setIsDark] = useState(false);
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

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <ThemeProvider value={{ isDark, toggleTheme }}>
      <AuthProvider>
        <div className={`min-h-screen transition-colors ${isDark ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
          <Router>
            <AppContent 
              isDark={isDark} 
              toggleTheme={toggleTheme}
              formData={formData}
              setFormData={setFormData}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </Router>
          <GlobalAuthModal isDark={isDark} />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
};

const GlobalAuthModal = ({ isDark }) => {
  const { authModalConfig, closeAuthModal } = useAuth();
  return (
    <AuthModal
      isOpen={authModalConfig.isOpen}
      onClose={closeAuthModal}
      title={authModalConfig.title}
      subtitle={authModalConfig.subtitle}
      onSuccess={authModalConfig.onAuthSuccess}
      isDark={isDark}
    />
  );
};

const AppContent = ({ currentPath, navigate, isDark, toggleTheme, formData, setFormData, isLoading, setIsLoading }) => {
  const renderPage = () => {
    const basePath = (currentPath || '').split('?')[0];
    switch (basePath) {
      case '/':
        return <LandingPage navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />;
      case '/start':
        return <IdeaInputPage navigate={navigate} formData={formData} setFormData={setFormData} isLoading={isLoading} setIsLoading={setIsLoading} isDark={isDark} toggleTheme={toggleTheme} />;
      case '/dashboard':
        return <DashboardPage navigate={navigate} data={mockDashboardData} isDark={isDark} toggleTheme={toggleTheme} currentPath={currentPath} />;
      case '/pitch-preview':
        return <PitchPreviewPage navigate={navigate} data={mockDashboardData} isDark={isDark} toggleTheme={toggleTheme} />;
      case '/my-plans':
        return <HistoryPage navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />;
      default:
        return <LandingPage navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />;
    }
  };

  return renderPage();
};

export default App;