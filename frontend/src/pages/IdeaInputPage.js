import React, { useState, useEffect } from 'react';
import { Lightbulb, Target, Users, ArrowRight, Sparkles, CheckCircle, Zap, Brain, Rocket } from 'lucide-react';
import Header from '../components/Header';
import { businessDomains } from '../utils/mockData';
import axios from 'axios';

const IdeaInputPage = ({ navigate, formData, setFormData, isLoading, setIsLoading, isDark, toggleTheme }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedFields, setCompletedFields] = useState(new Set());

  useEffect(() => {
    setIsVisible(true);
    // Track completed fields
    const completed = new Set();
    if (formData.name) completed.add('name');
    if (formData.domain) completed.add('domain');
    if (formData.problem) completed.add('problem');
    if (formData.solution) completed.add('solution');
    if (formData.audience) completed.add('audience');
    if (formData.usp) completed.add('usp');
    setCompletedFields(completed);
  }, [formData]);

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

  const progressPercentage = (completedFields.size / 6) * 100;

  const steps = [
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: "Basic Information",
      description: "Tell us about your startup",
      fields: ['name', 'domain']
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Problem & Solution",
      description: "Define what you're solving",
      fields: ['problem', 'solution']
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Market & Positioning",
      description: "Identify your audience",
      fields: ['audience', 'usp']
    }
  ];

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center relative overflow-hidden ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 ${isDark ? 'bg-indigo-500' : 'bg-indigo-200'} animate-pulse`}></div>
          <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 ${isDark ? 'bg-purple-500' : 'bg-purple-200'} animate-pulse delay-1000`}></div>
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 ${isDark ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-r from-indigo-300 to-purple-300'} animate-spin`} style={{animationDuration: '20s'}}></div>
        </div>

        <div className="text-center relative z-10">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto mb-4 relative">
              <div className={`absolute inset-2 rounded-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}></div>
            </div>
            <Brain className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Analyzing your startup idea...
          </h2>
          <p className={`text-lg mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Our AI is generating your comprehensive business plan
          </p>
          
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="flex space-x-1">
              {[1,2,3].map((i) => (
                <div key={i} className={`w-2 h-2 rounded-full bg-indigo-600 animate-bounce`} style={{animationDelay: `${i * 0.2}s`}}></div>
              ))}
            </div>
          </div>
          
          <div className={`max-w-md mx-auto p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white/50 border border-gray-200'} backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-4">
              <Rocket className="w-5 h-5 text-indigo-600" />
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Processing...</span>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              This may take 30-60 seconds. We're creating your lean canvas, MVP plan, competitor analysis, and investor pitch.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative overflow-hidden ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 ${isDark ? 'bg-indigo-500' : 'bg-indigo-200'} animate-pulse`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 ${isDark ? 'bg-purple-500' : 'bg-purple-200'} animate-pulse delay-1000`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 ${isDark ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-r from-indigo-300 to-purple-300'} animate-spin`} style={{animationDuration: '20s'}}></div>
      </div>

      <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Enhanced Header Section */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold mb-8 shadow-lg">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Business Planning</span>
            <Sparkles className="w-4 h-4" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Tell us about your
            </span>
            <br />
            <span className={isDark ? 'text-white' : 'text-gray-900'}>
              startup idea
            </span>
          </h1>
          
          <p className={`text-xl mb-8 max-w-3xl mx-auto leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Provide some basic information and we'll generate a comprehensive business plan, 
            competitor analysis, and investor-ready pitch deck for you.
          </p>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Progress
              </span>
              <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className={`w-full bg-gray-200 rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center space-x-8 mb-8">
            {steps.map((step, index) => {
              const isCompleted = step.fields.every(field => completedFields.has(field));
              const isActive = step.fields.some(field => completedFields.has(field)) && !isCompleted;
              
              return (
                <div key={index} className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                      : isActive 
                        ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-500' 
                        : isDark 
                          ? 'bg-gray-800 text-gray-500 border border-gray-700' 
                          : 'bg-gray-100 text-gray-400 border border-gray-300'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-6 h-6" /> : step.icon}
                  </div>
                  <span className={`text-xs font-medium ${
                    isCompleted || isActive 
                      ? 'text-indigo-600' 
                      : isDark 
                        ? 'text-gray-500' 
                        : 'text-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className={`rounded-3xl p-8 transition-all duration-500 hover:shadow-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold flex items-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center mr-4">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                Basic Information
              </h2>
              <div className="flex items-center space-x-2">
                {['name', 'domain'].map(field => (
                  <div key={field} className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    completedFields.has(field) 
                      ? 'bg-green-500' 
                      : formData[field] 
                        ? 'bg-yellow-500' 
                        : isDark 
                          ? 'bg-gray-700' 
                          : 'bg-gray-300'
                  }`}></div>
                ))}
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold mb-3 flex items-center">
                  <span className="text-red-500 mr-1">*</span>
                  Startup Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-6 py-4 rounded-xl border-2 transition-all duration-300 text-lg ${
                    isDark 
                      ? 'bg-gray-700/50 border-gray-600 focus:border-indigo-500 focus:bg-gray-700' 
                      : 'bg-gray-50 border-gray-300 focus:border-indigo-500 focus:bg-white'
                  } focus:outline-none shadow-sm hover:shadow-md`}
                  placeholder="Enter your startup name"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold mb-3">Business Domain</label>
                <select
                  value={formData.domain}
                  onChange={(e) => handleInputChange('domain', e.target.value)}
                  className={`w-full px-6 py-4 rounded-xl border-2 transition-all duration-300 text-lg ${
                    isDark 
                      ? 'bg-gray-700/50 border-gray-600 focus:border-indigo-500 focus:bg-gray-700' 
                      : 'bg-gray-50 border-gray-300 focus:border-indigo-500 focus:bg-white'
                  } focus:outline-none shadow-sm hover:shadow-md`}
                >
                  <option value="">Select a domain</option>
                  {businessDomains.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Problem & Solution Section */}
          <div className={`rounded-3xl p-8 transition-all duration-500 hover:shadow-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold flex items-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center mr-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                Problem & Solution
              </h2>
              <div className="flex items-center space-x-2">
                {['problem', 'solution'].map(field => (
                  <div key={field} className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    completedFields.has(field) 
                      ? 'bg-green-500' 
                      : formData[field] 
                        ? 'bg-yellow-500' 
                        : isDark 
                          ? 'bg-gray-700' 
                          : 'bg-gray-300'
                  }`}></div>
                ))}
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold mb-3 flex items-center">
                  <span className="text-red-500 mr-1">*</span>
                  Problem Statement
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.problem}
                  onChange={(e) => handleInputChange('problem', e.target.value)}
                  className={`w-full px-6 py-4 rounded-xl border-2 transition-all duration-300 text-lg ${
                    isDark 
                      ? 'bg-gray-700/50 border-gray-600 focus:border-indigo-500 focus:bg-gray-700' 
                      : 'bg-gray-50 border-gray-300 focus:border-indigo-500 focus:bg-white'
                  } focus:outline-none resize-none shadow-sm hover:shadow-md`}
                  placeholder="What problem does your startup solve? Be specific about the pain point your target customers face."
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold mb-3 flex items-center">
                  <span className="text-red-500 mr-1">*</span>
                  Solution
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.solution}
                  onChange={(e) => handleInputChange('solution', e.target.value)}
                  className={`w-full px-6 py-4 rounded-xl border-2 transition-all duration-300 text-lg ${
                    isDark 
                      ? 'bg-gray-700/50 border-gray-600 focus:border-indigo-500 focus:bg-gray-700' 
                      : 'bg-gray-50 border-gray-300 focus:border-indigo-500 focus:bg-white'
                  } focus:outline-none resize-none shadow-sm hover:shadow-md`}
                  placeholder="How does your product solve this problem? Explain your approach and key features."
                />
              </div>
            </div>
          </div>

          {/* Market & Positioning Section */}
          <div className={`rounded-3xl p-8 transition-all duration-500 hover:shadow-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold flex items-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center mr-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                Market & Positioning
              </h2>
              <div className="flex items-center space-x-2">
                {['audience', 'usp'].map(field => (
                  <div key={field} className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    completedFields.has(field) 
                      ? 'bg-green-500' 
                      : formData[field] 
                        ? 'bg-yellow-500' 
                        : isDark 
                          ? 'bg-gray-700' 
                          : 'bg-gray-300'
                  }`}></div>
                ))}
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold mb-3 flex items-center">
                  <span className="text-red-500 mr-1">*</span>
                  Target Audience
                </label>
                <input
                  type="text"
                  required
                  value={formData.audience}
                  onChange={(e) => handleInputChange('audience', e.target.value)}
                  className={`w-full px-6 py-4 rounded-xl border-2 transition-all duration-300 text-lg ${
                    isDark 
                      ? 'bg-gray-700/50 border-gray-600 focus:border-indigo-500 focus:bg-gray-700' 
                      : 'bg-gray-50 border-gray-300 focus:border-indigo-500 focus:bg-white'
                  } focus:outline-none shadow-sm hover:shadow-md`}
                  placeholder="Who is your ideal customer? (e.g., Small business owners, Students, etc.)"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold mb-3 flex items-center">
                  <span className="text-red-500 mr-1">*</span>
                  Unique Selling Proposition
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.usp}
                  onChange={(e) => handleInputChange('usp', e.target.value)}
                  className={`w-full px-6 py-4 rounded-xl border-2 transition-all duration-300 text-lg ${
                    isDark 
                      ? 'bg-gray-700/50 border-gray-600 focus:border-indigo-500 focus:bg-gray-700' 
                      : 'bg-gray-50 border-gray-300 focus:border-indigo-500 focus:bg-white'
                  } focus:outline-none resize-none shadow-sm hover:shadow-md`}
                  placeholder="What makes your solution unique? Why should customers choose you over competitors?"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold mb-3">Idea Summary (Optional)</label>
                <textarea
                  rows={4}
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  className={`w-full px-6 py-4 rounded-xl border-2 transition-all duration-300 text-lg ${
                    isDark 
                      ? 'bg-gray-700/50 border-gray-600 focus:border-indigo-500 focus:bg-gray-700' 
                      : 'bg-gray-50 border-gray-300 focus:border-indigo-500 focus:bg-white'
                  } focus:outline-none resize-none shadow-sm hover:shadow-md`}
                  placeholder="Provide any additional context about your startup idea, business model, or vision..."
                />
              </div>
            </div>
          </div>

          {/* Enhanced CTA Section */}
          <div className="text-center pt-8">
            <div className={`max-w-2xl mx-auto p-8 rounded-3xl ${isDark ? 'bg-gradient-to-r from-gray-800 to-gray-700' : 'bg-gradient-to-r from-gray-50 to-gray-100'} mb-8`}>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Ready to validate your idea?
              </h3>
              <p className={`text-lg mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Our AI will generate a comprehensive business plan including lean canvas, 
                competitor analysis, MVP roadmap, and investor pitch deck.
              </p>
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  <span>AI Analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <span>Smart Insights</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Rocket className="w-5 h-5 text-pink-600" />
                  <span>Investor Ready</span>
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={!formData.name || !formData.problem || !formData.solution || !formData.audience || !formData.usp}
              className="group bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-12 py-5 rounded-2xl text-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center space-x-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <span>Generate Business Plan</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <p className={`text-sm mt-4 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              <span className="text-green-600">✓</span> Free to use • <span className="text-green-600">✓</span> No credit card required • <span className="text-green-600">✓</span> Instant results
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IdeaInputPage;