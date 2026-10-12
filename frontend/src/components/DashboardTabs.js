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
  Share2,
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
  RotateCcw,
  RefreshCw,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { normalizePlanData, triggerPrintWithTitle } from '../utils/exportHelpers';

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

      {/* Confirmed Startup Brief Highlight (when available) */}
      {data?.brief && (
        <div className={`rounded-3xl p-6 mb-8 border ${isDark ? 'bg-gradient-to-r from-teal-950/40 to-emerald-950/30 border-teal-800/50' : 'bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200'} shadow-md`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 flex items-center justify-center text-white">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-lg">Confirmed Startup Brief</h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                    Canonical Foundation
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Single source of truth guiding all 6 downstream modules
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'}`}>
              <span className={`text-xs block font-medium ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Archetype</span>
              <span className="font-bold text-sm">{data.brief.aiInterpretations?.category || 'General'}</span>
            </div>
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'}`}>
              <span className={`text-xs block font-medium ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Business Model</span>
              <span className="font-bold text-sm">{data.brief.aiInterpretations?.businessModel || 'Direct'}</span>
            </div>
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'}`}>
              <span className={`text-xs block font-medium ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Key Assumptions</span>
              <span className="font-bold text-sm">{Array.isArray(data.brief.assumptions) ? `${data.brief.assumptions.length} Hypothesized` : '0'}</span>
            </div>
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'}`}>
              <span className={`text-xs block font-medium ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Status</span>
              <span className="font-bold text-sm capitalize">{data.brief.status || 'Confirmed'}</span>
            </div>
          </div>
        </div>
      )}

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

export const LeanCanvasTab = ({ data, isDark, navigate }) => {
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
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6 max-w-md mx-auto`}>
            Lean canvas data is not available for this plan. You can generate a complete new plan with all modules from the idea intake.
          </p>
          <button
            onClick={() => navigate ? navigate('/start') : (window.location.href = '/start')}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
          >
            <span>Start New Business Plan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export const MVPTab = ({ data, isDark, navigate }) => {
  const mvpData = data.mvp;
  const coreFeatures = mvpData?.coreFeatures || (Array.isArray(mvpData) ? mvpData : []);
  const hasMvpData = Boolean(
    mvpData &&
    (mvpData.startupName || mvpData.technicalRequirements || mvpData.launchTimeline || (Array.isArray(coreFeatures) && coreFeatures.length > 0))
  );

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

      {!hasMvpData ? (
        <div className={`p-8 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg text-center`}>
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No MVP Data Available</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6 max-w-md mx-auto`}>
            MVP plan data is not available for this plan. You can generate a complete new plan with all modules from the idea intake.
          </p>
          <button
            onClick={() => navigate ? navigate('/start') : (window.location.href = '/start')}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
          >
            <span>Start New Business Plan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export const RevenueTab = ({ data, isDark, navigate }) => {
  const rawRevenue = data.revenue;
  const isArray = Array.isArray(rawRevenue) && rawRevenue.length > 0;
  const isObject = rawRevenue && typeof rawRevenue === 'object' && !Array.isArray(rawRevenue) && (
    rawRevenue.revenueStreams || rawRevenue.pricingStrategy || rawRevenue.expectedMonthlyRevenue || rawRevenue.growthOpportunities
  );
  const hasRevenueData = isArray || Boolean(isObject);

  // Normalize streams, pricing strategy, monthly revenue, and growth opportunities
  let streams = [];
  let pricingStrategy = '';
  let expectedMonthlyRevenue = '';
  let growthOpportunities = null;

  if (isArray) {
    streams = rawRevenue;
    const growthItem = rawRevenue.find(item => item && (item.model?.toLowerCase().includes('growth') || item.growthOpportunities));
    if (growthItem) {
      growthOpportunities = growthItem.description || growthItem.growthOpportunities;
    }
  } else if (isObject) {
    pricingStrategy = rawRevenue.pricingStrategy || '';
    expectedMonthlyRevenue = rawRevenue.expectedMonthlyRevenue || '';
    growthOpportunities = rawRevenue.growthOpportunities || null;

    if (Array.isArray(rawRevenue.revenueStreams)) {
      streams = rawRevenue.revenueStreams.map((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          return {
            model: item.stream || item.model || `Revenue Stream ${idx + 1}`,
            description: item.description || '',
            projection: item.pricingModel || item.projection || ''
          };
        }
        return {
          model: `Revenue Stream ${idx + 1}`,
          description: String(item),
          projection: ''
        };
      });
    } else if (typeof rawRevenue.revenueStreams === 'string') {
      streams = [{
        model: 'Primary Revenue Stream',
        description: rawRevenue.revenueStreams,
        projection: expectedMonthlyRevenue || ''
      }];
    }
  }

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

      {!hasRevenueData ? (
        <div className={`p-8 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg text-center`}>
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Revenue Data</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6 max-w-md mx-auto`}>
            Revenue model data is not available for this plan. You can generate a complete new plan with all modules from the idea intake.
          </p>
          <button
            onClick={() => navigate ? navigate('/start') : (window.location.href = '/start')}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
          >
            <span>Start New Business Plan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Target Revenue Projection Run-Rate if available from AI */}
          {expectedMonthlyRevenue && (
            <div className={`p-6 rounded-2xl ${isDark ? 'bg-emerald-950/30 border border-emerald-800/50' : 'bg-emerald-50 border border-emerald-100'} shadow-md`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Target Monthly Revenue Projection
                  </h4>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                    {expectedMonthlyRevenue}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Revenue Streams */}
          {streams.length > 0 && (
            <div className="grid gap-6">
              {streams.map((model, index) => (
                <div key={index} className={`group p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-green-600">
                          {model.model || model.stream || `Revenue Stream ${index + 1}`}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Monetization stream
                        </p>
                      </div>
                    </div>
                    {model.projection && (
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${isDark ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                        {model.projection}
                      </span>
                    )}
                  </div>

                  <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} group-hover:bg-green-50 transition-colors duration-300`}>
                    <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {model.description || 'No description available'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pricing Strategy */}
          {pricingStrategy && (
            <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-white">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Pricing Strategy</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Monetization model & value capture approach
                  </p>
                </div>
              </div>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {pricingStrategy}
                </p>
              </div>
            </div>
          )}

          {/* Growth Opportunities */}
          {growthOpportunities && (
            <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Growth & Expansion Opportunities</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Strategic avenues for business expansion and scaling
                  </p>
                </div>
              </div>
              {Array.isArray(growthOpportunities) ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {growthOpportunities.map((opp, idx) => (
                    <div key={idx} className={`flex items-start space-x-3 p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                      <span className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {typeof opp === 'string' ? opp : JSON.stringify(opp)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className={`leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {growthOpportunities}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CompetitorsTab = ({ data, isDark, navigate }) => {
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
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6 max-w-md mx-auto`}>
            Competitor analysis data is not available for this plan. You can generate a complete new plan with all modules from the idea intake.
          </p>
          <button
            onClick={() => navigate ? navigate('/start') : (window.location.href = '/start')}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
          >
            <span>Start New Business Plan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export const PersonasTab = ({ data, isDark, navigate }) => {
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
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6 max-w-md mx-auto`}>
            User persona data is not available for this plan. You can generate a complete new plan with all modules from the idea intake.
          </p>
          <button
            onClick={() => navigate ? navigate('/start') : (window.location.href = '/start')}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg"
          >
            <span>Start New Business Plan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export const ExportTab = ({ data, navigate, isDark, onOpenShare }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingFinancial, setIsExportingFinancial] = useState(false);
  const [financialExportError, setFinancialExportError] = useState(null);
  const [financialExportSuccess, setFinancialExportSuccess] = useState(false);

  const handleExportBusinessPlan = () => {
    setIsExporting(true);
    const normalized = normalizePlanData(data);
    const safeName = (normalized.name || 'Startup').replace(/[^a-zA-Z0-9_-]/g, '_');
    triggerPrintWithTitle(`${safeName}-Business-Plan`, 'portrait');
    setTimeout(() => {
      setIsExporting(false);
    }, 500);
  };

  const handleExportFinancialModel = async () => {
    if (!data) return;
    if (isExportingFinancial) return;

    setIsExportingFinancial(true);
    setFinancialExportError(null);
    setFinancialExportSuccess(false);

    try {
      const { exportFinancialModelXlsx } = await import('../utils/financialExportHelpers');
      await exportFinancialModelXlsx(data);
      setFinancialExportSuccess(true);
      setTimeout(() => {
        setFinancialExportSuccess(false);
      }, 3500);
    } catch (err) {
      console.error('[ExportTab] Failed to export financial model:', err);
      setFinancialExportError(err?.message || 'Failed to generate Financial Model spreadsheet.');
    } finally {
      setIsExportingFinancial(false);
    }
  };

  const handleNavigatePitchDeck = () => {
    navigate('/pitch-preview');
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
              Save as PDF or share your vision with investors and stakeholders
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
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
              Export a comprehensive, portrait business plan document ready to save as PDF via your browser's print dialog.
            </p>
            <div className={`p-3 rounded-xl mb-6 text-xs text-left ${isDark ? 'bg-gray-700/40 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
              <span className="font-semibold block mb-1">Print to PDF Guide:</span>
              Opens browser print preview. Select destination "Save as PDF" for clean portrait output.
            </div>

            {/* Features */}
            <div className="space-y-2 mb-6">
              {['Executive Summary & Overview', 'Problem & Solution Fit', 'Lean Canvas & Target Personas', 'MVP, Pricing & Competitors'].map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleExportBusinessPlan}
              disabled={isExporting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              title="Open print dialog to save as PDF"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Opens print dialog to save as PDF
            </p>
          </div>
        </div>

        {/* Pitch Deck */}
        <div className={`group p-8 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <PieChart className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-3">Pitch Deck</h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
              Interactive 7-slide presentation deck with landscape slide layouts, ready to present or export directly to PDF.
            </p>
            <div className={`p-3 rounded-xl mb-6 text-xs text-left ${isDark ? 'bg-gray-700/40 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
              <span className="font-semibold block mb-1">Presentation Mode:</span>
              Interactive slide-by-slide view with dedicated 16:9 landscape PDF export.
            </div>

            {/* Features */}
            <div className="space-y-2 mb-6">
              {['7-Slide Presentation Deck', '16:9 Landscape Print Layout', 'Problem, Solution & Market Fit', 'Monetization & Competition'].map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleNavigatePitchDeck}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-semibold flex items-center justify-center space-x-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Open Pitch Deck & Export</span>
            </button>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Navigate to Pitch Preview for slide navigation & landscape PDF export
            </p>
          </div>
        </div>
      </div>

      {/* Additional Export Options */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Financial Excel */}
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 text-center`}>
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div className="inline-block px-2 py-0.5 mb-2 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
            Interactive Spreadsheet
          </div>
          <h4 className="font-semibold mb-2">Financial Model</h4>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            12-month formula-driven Excel model (.xlsx) with editable assumptions
          </p>

          {financialExportError && (
            <div className="mb-3 p-2 text-xs rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300">
              {financialExportError}
            </div>
          )}

          <button
            type="button"
            onClick={handleExportFinancialModel}
            disabled={!data || isExportingFinancial}
            className={`font-medium text-sm flex items-center justify-center space-x-1 mx-auto transition-colors ${
              !data || isExportingFinancial
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-green-600 hover:text-green-700 dark:text-green-400 hover:underline cursor-pointer'
            }`}
            title={!data ? 'No plan data available to export' : 'Download 12-month financial model spreadsheet'}
          >
            {isExportingFinancial ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Excel...</span>
              </>
            ) : financialExportSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </>
            )}
          </button>
        </div>

        {/* Executive Summary */}
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg transition-all duration-300 text-center`}>
          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="inline-block px-2 py-0.5 mb-2 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
            Included in PDF
          </div>
          <h4 className="font-semibold mb-2">Executive Summary</h4>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            Included in the comprehensive Business Plan PDF
          </p>
          <button
            type="button"
            onClick={handleExportBusinessPlan}
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium text-sm flex items-center justify-center space-x-1 mx-auto hover:underline cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export in PDF</span>
          </button>
        </div>

        {/* Share Link */}
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all duration-300 text-center`}>
          <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <div className="inline-block px-2 py-0.5 mb-2 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
            Public Presentation
          </div>
          <h4 className="font-semibold mb-2">Share Online</h4>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            Generate and manage your public presentation link
          </p>
          <button
            type="button"
            onClick={onOpenShare}
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium text-sm flex items-center justify-center space-x-1 mx-auto hover:underline cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>Manage Link</span>
          </button>
        </div>

        {/* Cap Table & Equity (Unsupported / Coming Soon) */}
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg transition-all duration-300 text-center opacity-75`}>
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <PieChart className="w-6 h-6 text-white" />
          </div>
          <div className="inline-block px-2 py-0.5 mb-2 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            Coming Soon
          </div>
          <h4 className="font-semibold mb-2">Cap Table & Equity</h4>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            Multi-round equity dilution and investor ownership model
          </p>
          <button disabled className="text-gray-400 font-medium text-sm flex items-center justify-center space-x-1 mx-auto cursor-not-allowed">
            <Download className="w-4 h-4" />
            <span>Unavailable</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const BriefTab = ({ brief, isDark, navigate }) => {
  const [showRawInput, setShowRawInput] = useState(false);

  if (!brief) {
    return (
      <div className={`p-10 rounded-3xl border text-center ${isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
          <FileText className="w-8 h-8" />
        </div>
        <div className="inline-block px-3 py-1 mb-3 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
          Legacy Plan
        </div>
        <h3 className="text-2xl font-bold mb-2">Startup Brief Not Attached</h3>
        <p className={`text-sm max-w-md mx-auto mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          This startup plan was created before canonical Startup Briefs were introduced. All 6 generated modules remain fully functional.
        </p>
        <button
          onClick={() => navigate ? navigate('/start') : (window.location.href = '/start')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          Start New Business Plan
        </button>
      </div>
    );
  }

  const facts = brief.facts || {};
  const interpretations = brief.aiInterpretations || {};
  const assumptions = Array.isArray(brief.assumptions) ? brief.assumptions : [];
  const questions = Array.isArray(brief.clarificationQuestions) ? brief.clarificationQuestions : [];
  const rawInput = brief.rawInput || {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Badge */}
      <div className={`rounded-3xl p-6 sm:p-8 border shadow-lg ${
        isDark ? 'bg-gradient-to-br from-teal-950/40 to-emerald-950/30 border-teal-800/60' : 'bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold">Canonical Startup Brief</h2>
                <span className="text-xs px-3 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-300">
                  Version {brief.schemaVersion || 1} • {brief.status || 'Confirmed'}
                </span>
              </div>
              <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                User-confirmed source of truth powering all 6 AI generative modules
              </p>
            </div>
          </div>

          {brief.metadata?.confirmedAt && (
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Confirmed {new Date(brief.metadata.confirmedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* AI Interpretations Summary */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-white border-gray-200'}`}>
            <span className={`text-xs block font-semibold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Business Category</span>
            <span className="font-bold text-sm">{interpretations.category || 'General'}</span>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-white border-gray-200'}`}>
            <span className={`text-xs block font-semibold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Monetization Archetype</span>
            <span className="font-bold text-sm">{interpretations.businessModel || 'Direct'}</span>
          </div>

          <div className={`p-4 rounded-2xl sm:col-span-2 border ${isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-white border-gray-200'}`}>
            <span className={`text-xs block font-semibold mb-1 ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>Market Dynamics</span>
            <span className="text-xs leading-relaxed line-clamp-2">{interpretations.targetMarketDynamics || 'Active addressable demand.'}</span>
          </div>
        </div>

        {interpretations.coreValueProposition && (
          <div className={`mt-4 p-3.5 rounded-xl text-xs flex items-start space-x-2.5 ${isDark ? 'bg-teal-950/50 text-teal-200 border border-teal-800/60' : 'bg-teal-100/60 text-teal-800 border border-teal-200'}`}>
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-teal-500" />
            <div>
              <span className="font-semibold">Core Value Proposition: </span>
              {interpretations.coreValueProposition}
            </div>
          </div>
        )}
      </div>

      {/* Core Business Facts */}
      <div className={`rounded-3xl p-6 sm:p-8 border shadow-lg ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-bold">Confirmed Business Facts</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                Founder Verified
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Explicit dimensions defined by the founder
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">Startup Name</span>
            <span className="text-base font-bold">{facts.startupName || 'Untitled'}</span>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">Industry</span>
            <span className="text-base font-medium">{facts.industry || 'Not specified'}</span>
          </div>

          <div className={`p-4 rounded-2xl border md:col-span-2 ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">Problem Statement</span>
            <p className="text-sm leading-relaxed">{facts.problem || 'Not specified'}</p>
          </div>

          <div className={`p-4 rounded-2xl border md:col-span-2 ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">Proposed Solution</span>
            <p className="text-sm leading-relaxed">{facts.solution || 'Not specified'}</p>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">Target Audience</span>
            <span className="text-sm font-medium">{facts.targetAudience || 'Not specified'}</span>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">Unique Selling Proposition</span>
            <span className="text-sm font-medium">{facts.usp || 'Not specified'}</span>
          </div>

          {facts.summary && (
            <div className={`p-4 rounded-2xl border md:col-span-2 ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <span className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 block mb-1">Founder Notes & Vision</span>
              <p className="text-sm leading-relaxed italic">{facts.summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Key Assumptions */}
      {assumptions.length > 0 && (
        <div className={`rounded-3xl p-6 sm:p-8 border shadow-lg ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-white">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold">Key Assumptions</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                  {assumptions.length} Hypotheses
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Core hypotheses underlying product and market viability
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {assumptions.map((a, idx) => (
              <div key={a.id || idx} className={`p-4 rounded-2xl border ${
                a.status === 'confirmed'
                  ? isDark ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-emerald-50/50 border-emerald-200'
                  : isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                    a.category === 'Market'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                      : a.category === 'Product'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {a.category || 'General'}
                  </span>
                  <span className={`text-[11px] ${a.status === 'confirmed' ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
                    {a.status === 'confirmed' ? '✓ Confirmed' : '• Unverified'}
                  </span>
                </div>
                <p className="text-sm font-medium leading-relaxed">{a.assumption}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clarification Questions */}
      {questions.length > 0 && (
        <div className={`rounded-3xl p-6 sm:p-8 border shadow-lg ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center text-white">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold">Clarification Questions</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  Refinement History
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Strategic ambiguities identified during intake
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id || idx} className={`p-4 rounded-2xl border ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-start space-x-2.5 mb-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <h5 className="text-sm font-semibold">{q.question}</h5>
                    {q.context && (
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{q.context}</p>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 pl-7">
                  {q.answer ? (
                    <div className={`p-3 rounded-xl text-xs ${isDark ? 'bg-emerald-950/30 border border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
                      <span className="font-semibold block mb-0.5">Founder Resolution:</span>
                      {q.answer}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Skipped during brief review</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Original Raw Founder Input (Provenance & Auditability) */}
      <div className={`rounded-3xl p-6 border ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Lightbulb className="w-5 h-5 text-indigo-500" />
            <h4 className="text-base font-bold">Original Founder Input (Provenance)</h4>
          </div>
          <button
            type="button"
            onClick={() => setShowRawInput(!showRawInput)}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            {showRawInput ? 'Hide Original Input' : 'Show Original Input'}
          </button>
        </div>

        {showRawInput && (
          <div className={`mt-4 p-4 rounded-2xl text-xs space-y-2 border font-mono ${isDark ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
            <div><span className="font-bold">Raw Startup Name:</span> {rawInput.startupName || 'Not provided'}</div>
            <div><span className="font-bold">Raw Problem:</span> {rawInput.problem || 'Not provided'}</div>
            <div><span className="font-bold">Raw Solution:</span> {rawInput.solution || 'Not provided'}</div>
            <div><span className="font-bold">Raw Audience:</span> {rawInput.targetAudience || 'Not provided'}</div>
            <div><span className="font-bold">Raw USP:</span> {rawInput.usp || 'Not provided'}</div>
            {rawInput.summary && <div><span className="font-bold">Raw Summary:</span> {rawInput.summary}</div>}
          </div>
        )}
      </div>
    </div>
  );
};
