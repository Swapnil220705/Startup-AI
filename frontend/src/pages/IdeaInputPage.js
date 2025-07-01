// src/pages/IdeaInputPage.js
import React from 'react';
import { Lightbulb, Target, Users, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import { businessDomains } from '../utils/mockData';
import axios from 'axios';

const IdeaInputPage = ({ navigate, formData, setFormData, isLoading, setIsLoading, isDark, toggleTheme }) => {
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        startupName: formData.name,
        industry: formData.domain,
        problem: formData.problem,
        solution: formData.solution,
        targetAudience: formData.audience,
        uniqueValueProposition: formData.usp
      };

      console.log('Sending payload:', payload);

      // Call all backend endpoints in parallel
      const [
        leanCanvasRes,
        mvpRes,
        revenueRes,
        pitchRes,
        personaRes,
        competitorRes
      ] = await Promise.all([
        axios.post('http://localhost:4000/api/lean-canvas', payload),
        axios.post('http://localhost:4000/api/mvp', payload),
        axios.post('http://localhost:4000/api/revenue', payload),
        axios.post('http://localhost:4000/api/pitch', payload),
        axios.post('http://localhost:4000/api/personas', payload),
        axios.post('http://localhost:4000/api/competitors', payload)
      ]);

      console.log('API Responses:', {
        leanCanvas: leanCanvasRes.data,
        mvp: mvpRes.data,
        revenue: revenueRes.data,
        pitch: pitchRes.data,
        personas: personaRes.data,
        competitors: competitorRes.data
      });

      // Store each response individually with the keys that DashboardPage expects
      localStorage.setItem('leanCanvas', JSON.stringify(leanCanvasRes.data));
      localStorage.setItem('mvp', JSON.stringify(mvpRes.data.coreFeatures || mvpRes.data));
      localStorage.setItem('revenue', JSON.stringify([
        {
          model: "Primary Revenue Stream",
          description: revenueRes.data.revenueStreams,
          projection: revenueRes.data.expectedMonthlyRevenue
        },
        {
          model: "Pricing Strategy", 
          description: revenueRes.data.pricingStrategy,
          projection: "Growth Phase"
        }
      ]));
      localStorage.setItem('pitch', JSON.stringify(pitchRes.data));
      localStorage.setItem('personas', JSON.stringify(personaRes.data.personas || personaRes.data));
      localStorage.setItem('competitors', JSON.stringify(competitorRes.data.competitors || competitorRes.data));
      
      // Also store form data for overview section
      localStorage.setItem('formData', JSON.stringify(formData));

      setIsLoading(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('API Error:', error);
      console.error('Error details:', error.response?.data);
      alert(`Failed to generate business plan: ${error.response?.data?.message || error.message}`);
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold mb-2">Analyzing your startup idea...</h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Our AI is generating your business plan</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>This may take 30-60 seconds...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Tell us about your startup idea</h1>
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Provide some basic information and we'll generate a comprehensive business plan for you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className={`rounded-2xl p-8 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-indigo-600" />
              Basic Information
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Startup Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${isDark ? 'bg-gray-700 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none`}
                  placeholder="Enter your startup name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Business Domain</label>
                <select
                  value={formData.domain}
                  onChange={(e) => handleInputChange('domain', e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${isDark ? 'bg-gray-700 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none`}
                >
                  <option value="">Select a domain</option>
                  {businessDomains.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-8 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Target className="w-5 h-5 mr-2 text-indigo-600" />
              Problem & Solution
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Problem Statement *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.problem}
                  onChange={(e) => handleInputChange('problem', e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${isDark ? 'bg-gray-700 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none resize-none`}
                  placeholder="What problem does your startup solve?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Solution *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.solution}
                  onChange={(e) => handleInputChange('solution', e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${isDark ? 'bg-gray-700 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none resize-none`}
                  placeholder="How does your product solve this problem?"
                />
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-8 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-600" />
              Market & Positioning
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Target Audience *</label>
                <input
                  type="text"
                  required
                  value={formData.audience}
                  onChange={(e) => handleInputChange('audience', e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${isDark ? 'bg-gray-700 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none`}
                  placeholder="Who is your target customer?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Unique Selling Proposition *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.usp}
                  onChange={(e) => handleInputChange('usp', e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${isDark ? 'bg-gray-700 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none resize-none`}
                  placeholder="What makes your solution unique?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Idea Summary (Optional)</label>
                <textarea
                  rows={4}
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors ${isDark ? 'bg-gray-700 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none resize-none`}
                  placeholder="Provide any additional context about your startup idea..."
                />
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              type="submit"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
            >
              <span>Generate Business Plan</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IdeaInputPage;