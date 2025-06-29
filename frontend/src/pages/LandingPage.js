// src/pages/LandingPage.js
import React from 'react';
import { Target, BarChart3, Zap, FileText, ArrowRight, Lightbulb } from 'lucide-react';
import Header from '../components/Header';

const LandingPage = ({ navigate, isDark, toggleTheme }) => {
  const features = [
    {
      icon: <Target className="w-8 h-8 text-indigo-600" />,
      title: "Lean Canvas Generator",
      description: "Transform your idea into a structured business model with AI-powered insights"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-emerald-600" />,
      title: "Competitor Analysis",
      description: "Identify your competition and discover your unique positioning in the market"
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-600" />,
      title: "MVP & Revenue Planning",
      description: "Get actionable recommendations for your minimum viable product and monetization"
    },
    {
      icon: <FileText className="w-8 h-8 text-purple-600" />,
      title: "Pitch Deck Export",
      description: "Generate investor-ready presentations with professional templates"
    }
  ];

  return (
    <div className="min-h-screen">
      <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Your AI Co-founder for Startup Planning
            </h1>
            <p className={`text-xl md:text-2xl mb-8 max-w-3xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Turn ideas into pitch-ready plans in minutes. Get structured business guidance with Lean Canvas, MVP planning, and investor presentations.
            </p>
            <button
              onClick={() => navigate('/start')}
              className="bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2 mx-auto"
            >
              <span>Start Planning Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`py-20 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to validate your startup</h2>
            <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
              Our AI analyzes your idea and generates comprehensive business insights to help you build with confidence.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className={`p-6 rounded-2xl transition-all duration-200 hover:scale-105 ${isDark ? 'bg-gray-900 hover:bg-gray-850' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to build your startup?</h2>
          <p className={`text-lg mb-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Join thousands of entrepreneurs who have validated their ideas with our AI-powered platform.
          </p>
          <button
            onClick={() => navigate('/start')}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t py-12 ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Lightbulb className="w-6 h-6 text-indigo-600" />
              <span className="text-xl font-bold">StartupAI</span>
            </div>
            <div className="flex space-x-6">
              <a href="#" className={`hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>About</a>
              <a href="#" className={`hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Contact</a>
              <a href="#" className={`hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>GitHub</a>
              <a href="#" className={`hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;