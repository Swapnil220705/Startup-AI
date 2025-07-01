// src/components/DashboardTabs.jsx
import React from 'react';
import { CheckCircle, FileText, PieChart } from 'lucide-react';

export const OverviewTab = ({ data, isDark }) => (
  <div className={`rounded-xl p-8 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
    <h2 className="text-2xl font-bold mb-6">Startup Overview</h2>
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 text-indigo-600">AI Analysis Summary</h3>
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
          Based on your input, {data.overview?.name || 'your startup'} appears to be a promising venture. 
          Your solution addresses a real market need with a clear value proposition. The target market shows strong 
          potential, and your unique approach could be a significant differentiator in the market.
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h4 className="font-semibold mb-2">Problem</h4>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {data.overview?.problem || 'No problem statement available'}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h4 className="font-semibold mb-2">Solution</h4>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {data.overview?.solution || 'No solution description available'}
          </p>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h4 className="font-semibold mb-2">Target Audience</h4>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {data.overview?.audience || 'No target audience specified'}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h4 className="font-semibold mb-2">Unique Selling Proposition</h4>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {data.overview?.usp || 'No USP specified'}
          </p>
        </div>
      </div>
    </div>
  </div>
);

export const LeanCanvasTab = ({ data, isDark }) => {
  const leanCanvasData = data.leanCanvas || {};
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Lean Canvas</h2>
      {Object.keys(leanCanvasData).length > 0 ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {Object.entries(leanCanvasData).map(([key, value]) => (
            <div key={key} className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className="font-semibold mb-3 text-indigo-600 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <div className="space-y-2">
                {Array.isArray(value) ? (
                  value.map((item, index) => (
                    <div key={index} className={`text-sm p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      {typeof item === 'string' ? item : JSON.stringify(item)}
                    </div>
                  ))
                ) : (
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {value || 'No data available'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            No lean canvas data available. Please try generating the business plan again.
          </p>
        </div>
      )}
    </div>
  );
};

export const MVPTab = ({ data, isDark }) => {
  const mvpData = data.mvp;
  const coreFeatures = mvpData?.coreFeatures || (Array.isArray(mvpData) ? mvpData : []);
  
  return (
    <div className={`rounded-xl p-8 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      <h2 className="text-2xl font-bold mb-6">MVP Development Plan</h2>
      
      {/* Display startup name and other MVP details if available */}
      {mvpData?.startupName && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-indigo-600 mb-2">
            MVP for {mvpData.startupName}
          </h3>
        </div>
      )}
      
      {/* Technical Requirements */}
      {mvpData?.technicalRequirements && (
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Technical Requirements:</h4>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
            {mvpData.technicalRequirements}
          </p>
        </div>
      )}
      
      {/* Core Features */}
      <div className="space-y-4">
        <h4 className="font-semibold">Core Features:</h4>
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-6`}>
          Start with these core features to validate your concept and gather user feedback:
        </p>
        
        {Array.isArray(coreFeatures) && coreFeatures.length > 0 ? (
          coreFeatures.map((feature, index) => (
            <div key={index} className={`flex items-start space-x-3 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {typeof feature === 'string' ? feature : JSON.stringify(feature)}
              </span>
            </div>
          ))
        ) : (
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            No MVP features available. Please try generating the business plan again.
          </p>
        )}
      </div>
      
      {/* Launch Timeline */}
      {mvpData?.launchTimeline && (
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Launch Timeline:</h4>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {mvpData.launchTimeline}
          </p>
        </div>
      )}
    </div>
  );
};

export const RevenueTab = ({ data, isDark }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold">Revenue & Monetization</h2>
    <div className="grid gap-6">
      {Array.isArray(data.revenue) && data.revenue.length > 0 ? (
        data.revenue.map((model, index) => (
          <div key={index} className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-indigo-600">
                {model.model || `Revenue Stream ${index + 1}`}
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                {model.projection || 'Projected'}
              </span>
            </div>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {model.description || 'No description available'}
            </p>
          </div>
        ))
      ) : (
        <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            No revenue data available. Please try generating the business plan again.
          </p>
        </div>
      )}
    </div>
  </div>
);

export const CompetitorsTab = ({ data, isDark }) => (
  <div className={`rounded-xl p-8 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
    <h2 className="text-2xl font-bold mb-6">Competitive Analysis</h2>
    {Array.isArray(data.competitors) && data.competitors.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <th className="text-left py-3 px-4 font-semibold">Competitor</th>
              <th className="text-left py-3 px-4 font-semibold">Description</th>
              <th className="text-left py-3 px-4 font-semibold">Your Advantage</th>
            </tr>
          </thead>
          <tbody>
            {data.competitors.map((competitor, index) => (
              <tr key={index} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <td className="py-4 px-4 font-medium">
                  {competitor.name || `Competitor ${index + 1}`}
                </td>
                <td className={`py-4 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {competitor.description || 'No description available'}
                </td>
                <td className="py-4 px-4 text-green-600">
                  {competitor.differentiator || 'No differentiator specified'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        No competitor data available. Please try generating the business plan again.
      </p>
    )}
  </div>
);

export const PersonasTab = ({ data, isDark }) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold">User Personas</h2>
    {Array.isArray(data.personas) && data.personas.length > 0 ? (
      <div className="grid lg:grid-cols-2 gap-6">
        {data.personas.map((persona, index) => (
          <div key={index} className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                {persona.name ? persona.name.charAt(0) : 'U'}
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {persona.name || `User ${index + 1}`}
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {persona.age || 'Age not specified'} years old, {persona.occupation || 'Occupation not specified'}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">Goals:</h4>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {persona.goals || 'No goals specified'}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Pain Points:</h4>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {persona.painPoints || 'No pain points specified'}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Tech Comfort Level:</h4>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {persona.techComfortLevel || 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          No persona data available. Please try generating the business plan again.
        </p>
      </div>
    )}
  </div>
);

export const ExportTab = ({ navigate, isDark }) => (
  <div className={`rounded-xl p-8 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
    <h2 className="text-2xl font-bold mb-6">Export Your Business Plan</h2>
    <div className="grid md:grid-cols-2 gap-6">
      <div className={`p-6 rounded-lg border-2 border-dashed ${isDark ? 'border-gray-600' : 'border-gray-300'} text-center`}>
        <FileText className="w-12 h-12 mx-auto mb-4 text-indigo-600" />
        <h3 className="font-semibold mb-2">Business Plan PDF</h3>
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Download a comprehensive PDF with all sections
        </p>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          Download PDF
        </button>
      </div>
      
      <div className={`p-6 rounded-lg border-2 border-dashed ${isDark ? 'border-gray-600' : 'border-gray-300'} text-center`}>
        <PieChart className="w-12 h-12 mx-auto mb-4 text-purple-600" />
        <h3 className="font-semibold mb-2">Pitch Deck</h3>
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Generate investor-ready presentation slides
        </p>
        <button 
          onClick={() => navigate('/pitch-preview')}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Create Pitch Deck
        </button>
      </div>
    </div>
  </div>
);