// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Target, 
  Zap, 
  DollarSign, 
  BarChart3, 
  Users, 
  Download 
} from 'lucide-react';
import Header from '../components/Header';
import {
  OverviewTab,
  LeanCanvasTab,
  MVPTab,
  RevenueTab,
  CompetitorsTab,
  PersonasTab,
  ExportTab
} from '../components/DashboardTabs';

const DashboardPage = ({ navigate, isDark, toggleTheme }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);

  useEffect(() => {
    const collectedData = {
      overview: {
        name: JSON.parse(localStorage.getItem('leanCanvas'))?.startupName || 'Your Startup',
        industry: JSON.parse(localStorage.getItem('leanCanvas'))?.industry || '',
        problem: JSON.parse(localStorage.getItem('leanCanvas'))?.problem || '',
        solution: JSON.parse(localStorage.getItem('leanCanvas'))?.solution || '',
        audience: JSON.parse(localStorage.getItem('leanCanvas'))?.targetAudience || '',
        usp: JSON.parse(localStorage.getItem('leanCanvas'))?.uniqueValueProposition || ''
      },
      leanCanvas: JSON.parse(localStorage.getItem('leanCanvas')),
      mvp: JSON.parse(localStorage.getItem('mvp')),
      revenue: JSON.parse(localStorage.getItem('revenue')),
      pitch: JSON.parse(localStorage.getItem('pitch')),
      personas: JSON.parse(localStorage.getItem('personas')),
      competitors: JSON.parse(localStorage.getItem('competitors'))
    };

    setData(collectedData);
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Globe className="w-4 h-4" /> },
    { id: 'canvas', label: 'Lean Canvas', icon: <Target className="w-4 h-4" /> },
    { id: 'mvp', label: 'MVP Plan', icon: <Zap className="w-4 h-4" /> },
    { id: 'revenue', label: 'Revenue', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'competitors', label: 'Competitors', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'personas', label: 'User Personas', icon: <Users className="w-4 h-4" /> },
    { id: 'export', label: 'Export', icon: <Download className="w-4 h-4" /> }
  ];

  if (!data) {
    return <div className="p-10 text-center">Loading business plan...</div>;
  }

  return (
    <div className="min-h-screen">
      <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} showNavigation={true} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Business Plan Dashboard</h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            AI-generated insights for {data.overview.name}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64">
            <nav className={`rounded-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="space-y-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id 
                        ? 'bg-indigo-600 text-white' 
                        : `hover:bg-gray-100 ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'text-gray-700'}`
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'overview' && <OverviewTab data={data} isDark={isDark} />}
            {activeTab === 'canvas' && <LeanCanvasTab data={data} isDark={isDark} />}
            {activeTab === 'mvp' && <MVPTab data={data} isDark={isDark} />}
            {activeTab === 'revenue' && <RevenueTab data={data} isDark={isDark} />}
            {activeTab === 'competitors' && <CompetitorsTab data={data} isDark={isDark} />}
            {activeTab === 'personas' && <PersonasTab data={data} isDark={isDark} />}
            {activeTab === 'export' && <ExportTab data={data} navigate={navigate} isDark={isDark} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
