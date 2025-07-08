import React, { useState } from 'react';
import { 
  CheckCircle, 
  FileText, 
  PieChart, 
  TrendingUp, 
  Users, 
  Target, 
  Zap,
  DollarSign,
  BarChart3,
  Sparkles,
  ArrowRight,
  Clock,
  Award,
  ChevronRight,
  Star,
  Download,
  ExternalLink,
  Globe,
  Lightbulb,
  Shield,
  Calendar,
  MapPin,
  Heart,
  Briefcase,
  Brain,
  Eye,
  Building,
  Rocket,
  TrendingDown,
  AlertCircle,
  Info,
  User,
  Smartphone,
  Laptop,
  Activity,
  Wifi,
  ChevronDown,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

export const OverviewTab = ({ data, isDark }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  React.useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      {/* Hero Section */}
      <div className={`rounded-3xl p-8 mb-8 relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100'} shadow-xl`}>
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AI Analysis Summary
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Comprehensive insights powered by artificial intelligence
              </p>
            </div>
          </div>
          
          <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white/70 border border-white/50'} backdrop-blur-sm`}>
            <p className={`text-lg leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <span className="font-semibold text-indigo-600">
                {data.overview?.name || 'Your startup'}
              </span>{' '}
              appears to be a promising venture with strong market potential. Your solution addresses a real market need with a clear value proposition. The target market shows excellent growth prospects, and your unique approach could be a significant differentiator in the competitive landscape.
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Market Potential', value: '95%', icon: TrendingUp, color: 'from-green-500 to-emerald-600' },
          { label: 'Innovation Score', value: '88%', icon: Lightbulb, color: 'from-yellow-500 to-orange-600' },
          { label: 'Feasibility', value: '92%', icon: Target, color: 'from-blue-500 to-cyan-600' },
          { label: 'Competition Edge', value: '85%', icon: Award, color: 'from-purple-500 to-pink-600' }
        ].map((metric, index) => (
          <div key={index} className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 group`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-r ${metric.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <metric.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Score</div>
              </div>
            </div>
            <h3 className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {metric.label}
            </h3>
          </div>
        ))}
      </div>

      {/* Core Information Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Problem & Solution */}
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">Problem Statement</h3>
          </div>
          <p className={`mb-6 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {data.overview?.problem || 'No problem statement available'}
          </p>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">Our Solution</h3>
          </div>
          <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {data.overview?.solution || 'No solution description available'}
          </p>
        </div>

        {/* Market & USP */}
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">Target Market</h3>
          </div>
          <p className={`mb-6 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {data.overview?.audience || 'No target audience specified'}
          </p>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">Unique Value Proposition</h3>
          </div>
          <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {data.overview?.usp || 'No USP specified'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const LeanCanvasTab = ({ data, isDark }) => {
  const leanCanvasData = data.leanCanvas || {};
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className={`rounded-3xl p-8 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100'} shadow-xl`}>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Lean Canvas
            </h2>
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Strategic business model visualization
            </p>
          </div>
        </div>
      </div>

      {/* Canvas Grid */}
      {Object.keys(leanCanvasData).length > 0 ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {Object.entries(leanCanvasData).map(([key, value], index) => (
            <div key={key} className={`group p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-indigo-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  {index + 1}
                </div>
              </div>
              
              <div className="space-y-3">
                {Array.isArray(value) ? (
                  value.map((item, itemIndex) => (
                    <div key={itemIndex} className={`flex items-start space-x-3 p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} group-hover:bg-indigo-50 transition-colors duration-300`}>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {typeof item === 'string' ? item : JSON.stringify(item)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} group-hover:bg-indigo-50 transition-colors duration-300`}>
                    <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {value || 'No data available'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-8 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg text-center`}>
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Lean Canvas Data</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
            No lean canvas data available. Please try generating the business plan again.
          </p>
          <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold">
            Generate Canvas
          </button>
        </div>
      )}
    </div>
  );
};

export const MVPTab = ({ data, isDark }) => {
  const mvpData = data.mvp;
  const coreFeatures = mvpData?.coreFeatures || (Array.isArray(mvpData) ? mvpData : []);
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className={`rounded-3xl p-8 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100'} shadow-xl`}>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              MVP Development Plan
            </h2>
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Minimum Viable Product roadmap
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* MVP Overview */}
        <div className="lg:col-span-2">
          <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
            {mvpData?.startupName && (
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">MVP for {mvpData.startupName}</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Strategic product development approach
                  </p>
                </div>
              </div>
            )}
            
            {mvpData?.technicalRequirements && (
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold">Technical Requirements</h4>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {mvpData.technicalRequirements}
                  </p>
                </div>
              </div>
            )}
            
            {/* Core Features */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-lg font-semibold">Core Features</h4>
              </div>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} mb-6`}>
                Start with these core features to validate your concept and gather user feedback:
              </p>
              
              {Array.isArray(coreFeatures) && coreFeatures.length > 0 ? (
                <div className="space-y-4">
                  {coreFeatures.map((feature, index) => (
                    <div key={index} className={`group flex items-start space-x-4 p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} hover:bg-green-50 transition-colors duration-300`}>
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                          {typeof feature === 'string' ? feature : JSON.stringify(feature)}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors duration-300" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} text-center`}>
                  <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No MVP features available. Please try generating the business plan again.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline & Milestones */}
        <div className="space-y-6">
          {mvpData?.launchTimeline && (
            <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-lg font-semibold">Launch Timeline</h4>
              </div>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {mvpData.launchTimeline}
                </p>
              </div>
            </div>
          )}

          {/* Development Phases */}
          <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-lg font-semibold">Development Phases</h4>
            </div>
            <div className="space-y-4">
              {['Planning & Research', 'Development', 'Testing', 'Launch'].map((phase, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${index < 2 ? 'bg-green-500' : 'bg-gray-400'}`}>
                    {index + 1}
                  </div>
                  <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'} ${index < 2 ? 'font-semibold' : ''}`}>
                    {phase}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RevenueTab = ({ data, isDark }) => {
  const revenueData = data.revenue || [];
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className={`rounded-3xl p-8 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100'} shadow-xl`}>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Revenue & Monetization
            </h2>
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Strategic revenue generation models
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Models */}
      {Array.isArray(revenueData) && revenueData.length > 0 ? (
        <div className="grid gap-6">
          {revenueData.map((model, index) => (
            <div key={index} className={`group p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-600">
                      {model.model || `Revenue Stream ${index + 1}`}
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Primary monetization strategy
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${isDark ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                    {model.projection || 'Projected'}
                  </span>
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
              
              <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} group-hover:bg-green-50 transition-colors duration-300`}>
                <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {model.description || 'No description available'}
                </p>
              </div>
              
              {/* Revenue Metrics */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} text-center`}>
                  <div className="text-lg font-bold text-green-600">$10K</div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Initial Target</div>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} text-center`}>
                  <div className="text-lg font-bold text-green-600">$50K</div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>6 Month Goal</div>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} text-center`}>
                  <div className="text-lg font-bold text-green-600">$200K</div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Year 1 Target</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-8 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg text-center`}>
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Revenue Data</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
            No revenue data available. Please try generating the business plan again.
          </p>
          <button className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-semibold">
            Generate Revenue Plan
          </button>
        </div>
      )}
    </div>
  );
};

export const CompetitorsTab = ({ data, isDark }) => {
  const competitors = data.competitors || [];
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className={`rounded-3xl p-8 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-red-50 to-pink-50 border border-red-100'} shadow-xl`}>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl flex items-center justify-center">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
              Competitive Analysis
            </h2>
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Market landscape and competitive positioning
            </p>
          </div>
        </div>
      </div>

      {/* Competitors Grid */}
      {Array.isArray(competitors) && competitors.length > 0 ? (
        <div className="grid gap-6">
          {competitors.map((competitor, index) => (
            <div key={index} className={`group p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-600">
                      {competitor.name || `Competitor ${index + 1}`}
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Market competitor
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${isDark ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                    Direct
                  </span>
                  <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Description */}
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                      <Info className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold">Description</h4>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} group-hover:bg-blue-50 transition-colors duration-300`}>
                    <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {competitor.description || 'No description available'}
                    </p>
                  </div>
                </div>

                {/* Your Advantage */}
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-lg font-semibold">Your Advantage</h4>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} group-hover:bg-green-50 transition-colors duration-300`}>
                    <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {competitor.differentiator || 'No differentiator specified'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Competitive Metrics */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} text-center`}>
                  <div className="text-lg font-bold text-yellow-600">Medium</div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Threat Level</div>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} text-center`}>
                  <div className="text-lg font-bold text-blue-600">Similar</div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Market Size</div>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} text-center`}>
                  <div className="text-lg font-bold text-green-600">High</div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Our Advantage</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-8 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg text-center`}>
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Competitor Data</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
            No competitor data available. Please try generating the business plan again.
          </p>
          <button className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 font-semibold">
            Analyze Competitors
          </button>
        </div>
      )}
    </div>
  );
};

export const PersonasTab = ({ data, isDark }) => {
  const personas = data.personas || [];
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className={`rounded-3xl p-8 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100'} shadow-xl`}>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              User Personas
            </h2>
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Target audience profiles and behaviors
            </p>
          </div>
        </div>
      </div>

      {/* Personas Grid */}
      {Array.isArray(personas) && personas.length > 0 ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {personas.map((persona, index) => (
            <div key={index} className={`group p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                    {persona.name ? persona.name.charAt(0) : 'U'}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-purple-600">
                    {persona.name || `User ${index + 1}`}
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {persona.age || 'Age not specified'} years old • {persona.occupation || 'Occupation not specified'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Goals */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg">Goals</h4>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} group-hover:bg-green-50 transition-colors duration-300`}>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {persona.goals || 'No goals specified'}
                    </p>
                  </div>
                </div>

                {/* Pain Points */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg">Pain Points</h4>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} group-hover:bg-red-50 transition-colors duration-300`}>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {persona.painPoints || 'No pain points specified'}
                    </p>
                  </div>
                </div>

                {/* Tech Comfort Level */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-lg">Tech Comfort</h4>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} group-hover:bg-blue-50 transition-colors duration-300`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {persona.techComfortLevel || 'Not specified'}
                      </span>
                      <div className="flex items-center space-x-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i < 3 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-8 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg text-center`}>
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Persona Data</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
            No persona data available. Please try generating the business plan again.
          </p>
          <button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 font-semibold">
            Create Personas
          </button>
        </div>
      )}
    </div>
  );
};

export const ExportTab = ({ navigate, isDark }) => {
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async (type) => {
    setIsExporting(true);
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      if (type === 'pitch') {
        navigate('/pitch-preview');
      }
    }, 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className={`rounded-3xl p-8 ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' : 'bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100'} shadow-xl`}>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center">
            <Download className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Export Your Business Plan
            </h2>
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Share your vision with investors and stakeholders
            </p>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Business Plan PDF */}
        <div className={`group p-8 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-3">Business Plan PDF</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
              Download a comprehensive PDF document with all sections including executive summary, market analysis, and financial projections
            </p>
            
            {/* Features */}
            <div className="space-y-2 mb-6">
              {['Executive Summary', 'Market Analysis', 'Financial Projections', 'Competitive Analysis'].map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{feature}</span>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isExporting ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Pitch Deck */}
        <div className={`group p-8 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <PieChart className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-3">Pitch Deck</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
              Generate investor-ready presentation slides with compelling visuals and key metrics for fundraising
            </p>
            
            {/* Features */}
            <div className="space-y-2 mb-6">
              {['10-12 Slide Deck', 'Investor-Ready Format', 'Visual Charts & Graphs', 'Problem-Solution Fit'].map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{feature}</span>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => handleExport('pitch')}
              disabled={isExporting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isExporting ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Create Pitch Deck</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Additional Export Options */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Financial Excel */}
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 text-center`}>
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h4 className="font-semibold mb-2">Financial Model</h4>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            Excel spreadsheet with financial projections
          </p>
          <button className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center justify-center space-x-1 mx-auto">
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>

        {/* Executive Summary */}
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 text-center`}>
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h4 className="font-semibold mb-2">Executive Summary</h4>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            One-page business overview
          </p>
          <button className="text-yellow-600 hover:text-yellow-700 font-medium text-sm flex items-center justify-center space-x-1 mx-auto">
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>

        {/* Share Link */}
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 text-center`}>
          <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-6 h-6 text-white" />
          </div>
          <h4 className="font-semibold mb-2">Share Link</h4>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            Shareable online version
          </p>
          <button className="text-cyan-600 hover:text-cyan-700 font-medium text-sm flex items-center justify-center space-x-1 mx-auto">
            <Globe className="w-4 h-4" />
            <span>Generate</span>
          </button>
        </div>
      </div>
    </div>
  );
};