// src/pages/HistoryPage.jsx
import React from 'react';
import { Lightbulb, Calendar } from 'lucide-react';
import Header from '../components/Header';

const HistoryPage = ({ navigate, isDark, toggleTheme }) => {
  const mockPlans = [
    { id: 1, name: "EcoTrack", domain: "Sustainability", created: "2024-06-20", status: "Complete" },
    { id: 2, name: "HealthBot", domain: "HealthTech", created: "2024-06-18", status: "Draft" },
    { id: 3, name: "EduStream", domain: "EdTech", created: "2024-06-15", status: "Complete" }
  ];

  return (
    <div className="min-h-screen">
      <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} showNavigation={true} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Startup Plans</h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage and access your previously created business plans
            </p>
          </div>
          <button 
            onClick={() => navigate('/start')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Create New Plan
          </button>
        </div>

        <div className="grid gap-6">
          {mockPlans.map((plan) => (
            <div key={plan.id} className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                    <Lightbulb className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {plan.domain}
                      </span>
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {plan.created}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        plan.status === 'Complete' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className={`px-4 py-2 rounded-lg transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    Open
                  </button>
                  <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {mockPlans.length === 0 && (
          <div className="text-center py-12">
            <Lightbulb className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className="text-xl font-semibold mb-2">No plans yet</h3>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
              Create your first startup business plan to get started
            </p>
            <button 
              onClick={() => navigate('/start')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create Your First Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;