import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Target, 
  Zap, 
  DollarSign, 
  BarChart3, 
  Users, 
  Download,
  Sparkles,
  TrendingUp,
  CheckCircle2
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
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      // Get form data for overview
      const formData = JSON.parse(localStorage.getItem('formData') || '{}');
      
      // Get individual data pieces
      const leanCanvas = JSON.parse(localStorage.getItem('leanCanvas') || 'null');
      const mvp = JSON.parse(localStorage.getItem('mvp') || 'null');
      const revenue = JSON.parse(localStorage.getItem('revenue') || 'null');
      const pitch = JSON.parse(localStorage.getItem('pitch') || 'null');
      const personas = JSON.parse(localStorage.getItem('personas') || 'null');
      const competitors = JSON.parse(localStorage.getItem('competitors') || 'null');

      console.log('Dashboard data loaded:', {
        formData,
        leanCanvas,
        mvp,
        revenue,
        pitch,
        personas,
        competitors
      });

      const collectedData = {
        overview: {
          name: formData.name || leanCanvas?.startupName || 'Your Startup',
          industry: formData.domain || leanCanvas?.industry || '',
          problem: formData.problem || leanCanvas?.problem || '',
          solution: formData.solution || leanCanvas?.solution || '',
          audience: formData.audience || leanCanvas?.audience || leanCanvas?.customerSegments || '',
          usp: formData.usp || leanCanvas?.uniqueValueProposition || ''
        },
        leanCanvas: leanCanvas,
        mvp: mvp,
        revenue: revenue,
        pitch: pitch,
        personas: personas,
        competitors: competitors
      };

      setData(collectedData);
      setLoading(false);
      setTimeout(() => setIsVisible(true), 100);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Globe className="w-5 h-5" />, gradient: 'from-blue-500 to-cyan-500' },
    { id: 'canvas', label: 'Lean Canvas', icon: <Target className="w-5 h-5" />, gradient: 'from-indigo-500 to-purple-500' },
    { id: 'mvp', label: 'MVP Plan', icon: <Zap className="w-5 h-5" />, gradient: 'from-yellow-500 to-orange-500' },
    { id: 'revenue', label: 'Revenue', icon: <DollarSign className="w-5 h-5" />, gradient: 'from-green-500 to-emerald-500' },
    { id: 'competitors', label: 'Competitors', icon: <BarChart3 className="w-5 h-5" />, gradient: 'from-red-500 to-pink-500' },
    { id: 'personas', label: 'User Personas', icon: <Users className="w-5 h-5" />, gradient: 'from-purple-500 to-pink-500' },
    { id: 'export', label: 'Export', icon: <Download className="w-5 h-5" />, gradient: 'from-gray-500 to-gray-600' }
  ];

  const getTabByStatus = () => {
    const completedTabs = [];
    if (data?.overview?.name) completedTabs.push('overview');
    if (data?.leanCanvas && Object.keys(data.leanCanvas).length > 0) completedTabs.push('canvas');
    if (data?.mvp) completedTabs.push('mvp');
    if (data?.revenue) completedTabs.push('revenue');
    if (data?.competitors) completedTabs.push('competitors');
    if (data?.personas) completedTabs.push('personas');
    
    return completedTabs;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} showNavigation={true} />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Loading your business plan...</h3>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Our AI is preparing your comprehensive dashboard
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} showNavigation={true} />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-md mx-auto px-4">
            <div className={`w-20 h-20 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'} flex items-center justify-center mx-auto mb-6`}>
              <Target className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4">No Business Plan Found</h3>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-8`}>
              It looks like you haven't created a business plan yet. Let's get started!
            </p>
            <button 
              onClick={() => navigate('/input')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Generate New Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completedTabs = getTabByStatus();

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} showNavigation={true} />

      {/* Enhanced Hero Section */}
      <div className="relative py-12 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className={`absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 ${isDark ? 'bg-indigo-500' : 'bg-indigo-200'} animate-pulse`}></div>
          <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-5 ${isDark ? 'bg-purple-500' : 'bg-purple-200'} animate-pulse delay-1000`}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Header with Status */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    <Sparkles className="w-4 h-4" />
                    <span>AI-Generated</span>
                  </div>
                  <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-semibold ${isDark ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{completedTabs.length} sections completed</span>
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {data.overview.name}
                  </span>
                  <br />
                  <span className={`text-2xl md:text-3xl ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Business Plan Dashboard
                  </span>
                </h1>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'} max-w-2xl`}>
                  AI-powered insights and comprehensive analysis for your startup journey
                </p>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 lg:gap-6 mt-8 lg:mt-0">
                <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg backdrop-blur-sm`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{completedTabs.length}</div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Sections Ready</div>
                    </div>
                  </div>
                </div>
                <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg backdrop-blur-sm`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">95%</div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Complete</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Enhanced Sidebar Navigation */}
          <div className="xl:w-80">
            <div className={`sticky top-24 rounded-3xl p-6 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-xl backdrop-blur-sm`}>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Navigation</h3>
                <div className={`w-full bg-gray-200 rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div 
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(completedTabs.length / tabs.length) * 100}%` }}
                  ></div>
                </div>
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {completedTabs.length} of {tabs.length} sections completed
                </p>
              </div>
              
              <div className="space-y-2">
                {tabs.map((tab, index) => {
                  const isActive = activeTab === tab.id;
                  const isCompleted = completedTabs.includes(tab.id);
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`group relative w-full flex items-center space-x-4 px-4 py-4 rounded-2xl text-left transition-all duration-300 ${
                        isActive 
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-105' 
                          : `hover:bg-gradient-to-r hover:${tab.gradient} hover:text-white ${isDark ? 'hover:bg-gray-700/50 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`
                      }`}
                    >
                      {/* Completion Indicator */}
                      {isCompleted && !isActive && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                      
                      {/* Icon with gradient background */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? 'bg-white/20' 
                          : `group-hover:bg-gradient-to-r group-hover:${tab.gradient} group-hover:text-white ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`
                      }`}>
                        {tab.icon}
                      </div>
                      
                      <div className="flex-1">
                        <span className="font-medium">{tab.label}</span>
                        {isCompleted && (
                          <div className={`text-xs mt-1 ${isActive ? 'text-white/80' : 'text-green-600'}`}>
                            Ready
                          </div>
                        )}
                      </div>
                      
                      {/* Hover Arrow */}
                      <div className={`transform transition-transform duration-300 ${isActive ? 'translate-x-0' : '-translate-x-2 group-hover:translate-x-0'}`}>
                        <div className="w-2 h-2 border-r-2 border-b-2 border-current rotate-[-45deg]"></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Enhanced Main Content */}
          <div className="flex-1">
            <div className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
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
    </div>
  );
};

export default DashboardPage;