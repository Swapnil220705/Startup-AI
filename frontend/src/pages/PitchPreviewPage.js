// src/pages/PitchPreviewPage.jsx
import React from 'react';
import { 
  Download, 
  CheckCircle, 
  Building, 
  Users, 
  TrendingUp 
} from 'lucide-react';
import Header from '../components/Header';

const PitchPreviewPage = ({ navigate, data, isDark, toggleTheme }) => {
  const slides = [
    {
      title: "Title Slide",
      content: (
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">{data.overview.name}</h1>
          <p className="text-xl text-indigo-600 mb-8">{data.overview.usp}</p>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>AI-Powered Startup Planning Tool</p>
        </div>
      )
    },
    {
      title: "Problem → Solution",
      content: (
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4 text-red-600">Problem</h3>
            <p className="text-lg">{data.overview.problem}</p>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-4 text-green-600">Solution</h3>
            <p className="text-lg">{data.overview.solution}</p>
          </div>
        </div>
      )
    },
    {
      title: "Market Opportunity",
      content: (
        <div>
          <h3 className="text-2xl font-bold mb-6">Target Market</h3>
          <p className="text-lg mb-6">{data.overview.audience}</p>
          <div className="grid md:grid-cols-3 gap-4">
            {data.leanCanvas.customerSegments.map((segment, index) => (
              <div key={index} className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {segment}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Product Overview",
      content: (
        <div>
          <h3 className="text-2xl font-bold mb-6">MVP Features</h3>
          <div className="space-y-3">
            {data.mvp.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Monetization",
      content: (
        <div>
          <h3 className="text-2xl font-bold mb-6">Revenue Streams</h3>
          <div className="space-y-4">
            {data.monetization.map((model, index) => (
              <div key={index} className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">{model.model}</h4>
                  <span className="text-green-600 font-medium">{model.projection}</span>
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{model.description}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Next Steps",
      content: (
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-6">Ready to Launch</h3>
          <p className="text-lg mb-8">
            With this comprehensive business plan, you're ready to start building and validating your startup idea.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <Building className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
              <p className="font-medium">Build MVP</p>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="font-medium">Find Customers</p>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="font-medium">Raise Funding</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen">
      <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} showNavigation={true} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pitch Deck Preview</h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Investor-ready presentation for {data.overview.name}
            </p>
          </div>
          <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>

        <div className="space-y-8">
          {slides.map((slide, index) => (
            <div key={index} className={`p-8 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Slide {index + 1}: {slide.title}</h2>
                <span className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  {index + 1} of {slides.length}
                </span>
              </div>
              <div className="min-h-64">
                {slide.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PitchPreviewPage;