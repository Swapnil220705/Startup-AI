// frontend/src/pages/SharedPlanPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lightbulb, 
  Moon, 
  Sun, 
  Building, 
  Target, 
  Rocket, 
  DollarSign, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Calendar, 
  Clock, 
  ArrowRight, 
  RefreshCw, 
  Lock, 
  Sparkles,
  Brain
} from 'lucide-react';
import api from '../services/api';

/**
 * SharedPlanPage
 * 
 * Public presentation page for shared startup plans.
 * Accessible to any visitor with a valid bearer token at /share/:token.
 * Unauthenticated, read-only, sanitized, and responsive.
 */
const SharedPlanPage = ({ token, navigate, isDark, toggleTheme }) => {
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'unavailable' | 'network_error'
  const [networkErrorMsg, setNetworkErrorMsg] = useState(null);

  // SEO & Search Engine Handling: Inject noindex, nofollow, noarchive metadata
  useEffect(() => {
    let metaRobots = document.querySelector('meta[name="robots"]');
    let created = false;
    let previousContent = null;

    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
      created = true;
    } else {
      previousContent = metaRobots.getAttribute('content');
    }

    metaRobots.setAttribute('content', 'noindex, nofollow, noarchive');

    return () => {
      if (created) {
        if (metaRobots && metaRobots.parentNode) {
          metaRobots.parentNode.removeChild(metaRobots);
        }
      } else if (metaRobots) {
        if (previousContent !== null) {
          metaRobots.setAttribute('content', previousContent);
        } else {
          metaRobots.removeAttribute('content');
        }
      }
    };
  }, []);

  // Fetch shared plan data via backend public endpoint
  const fetchSharedPlan = useCallback(async () => {
    if (!token || typeof token !== 'string' || !token.trim()) {
      setStatus('unavailable');
      return;
    }

    setStatus('loading');
    setNetworkErrorMsg(null);

    try {
      const trimmedToken = token.trim();
      const response = await api.get(`/api/shared/${encodeURIComponent(trimmedToken)}`);

      if (response?.data?.success && response?.data?.data) {
        setPlan(response.data.data);
        setStatus('success');
      } else {
        setStatus('unavailable');
      }
    } catch (err) {
      const statusCode = err.response?.status;
      if (statusCode === 404) {
        // Safe neutral message for non-existent, invalid, or revoked tokens
        setStatus('unavailable');
      } else if (
        !err.response ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED' ||
        err.message?.toLowerCase().includes('network') ||
        statusCode >= 500
      ) {
        setStatus('network_error');
        setNetworkErrorMsg('Unable to connect to the server. Please check your connection and try again.');
      } else {
        // Fallback for unexpected client errors
        setStatus('unavailable');
      }
    }
  }, [token]);

  useEffect(() => {
    fetchSharedPlan();
  }, [fetchSharedPlan]);

  // Format date helper (safe parsing)
  const formatDate = (isoString) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return null;
    }
  };

  // 1. LOADING STATE
  if (status === 'loading') {
    return (
      <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <PublicHeader navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold mb-2">Loading Shared Plan</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Retrieving the executive business presentation...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 2. UNAVAILABLE STATE (Neutral for invalid, revoked, or non-existent tokens)
  if (status === 'unavailable') {
    return (
      <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <PublicHeader navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className={`max-w-md w-full p-8 rounded-3xl text-center shadow-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Plan Unavailable</h2>
            <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              This shared plan is unavailable. The link may have expired or been revoked.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                Go to Homepage
              </button>
              <button
                onClick={() => navigate('/start')}
                className={`w-full py-3 px-4 rounded-xl text-sm font-semibold border transition-colors ${
                  isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-700/50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Create Your Own Startup Plan
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 3. NETWORK ERROR STATE (Provides retry action)
  if (status === 'network_error') {
    return (
      <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <PublicHeader navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className={`max-w-md w-full p-8 rounded-3xl text-center shadow-xl border ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Connection Problem</h2>
            <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {networkErrorMsg || 'Unable to load the shared plan due to a connection or server error.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={fetchSharedPlan}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className={`w-full py-3 px-4 rounded-xl text-sm font-semibold border transition-colors ${
                  isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-700/50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Return Home
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 4. SUCCESS STATE: Polished Read-Only Business Document
  const createdDate = formatDate(plan?.createdAt);
  const updatedDate = formatDate(plan?.updatedAt);
  const elevatorPitch = plan?.pitch?.elevatorPitch || plan?.pitch?.tagline || plan?.usp;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <PublicHeader navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 sm:space-y-12">
        {/* Read-Only Presentation Notice Banner */}
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm border ${
          isDark 
            ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300' 
            : 'bg-indigo-50 border-indigo-200 text-indigo-900'
        }`}>
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              <strong>Shared Presentation</strong> — You are viewing a read-only plan generated on StartupAI.
            </span>
          </div>
          <button
            onClick={() => navigate('/start')}
            className="hidden sm:inline-flex items-center space-x-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 shrink-0 ml-4"
          >
            <span>Create your own</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* SECTION 1: EXECUTIVE HERO & STARTUP OVERVIEW */}
        <section className={`rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-xl border ${
          isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2.5">
              {plan?.industry && (
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {plan.industry}
                </span>
              )}
              {createdDate && (
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} flex items-center space-x-1`}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Prepared {createdDate}</span>
                </span>
              )}
              {updatedDate && updatedDate !== createdDate && (
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} hidden sm:inline`}>
                  • Updated {updatedDate}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight break-words">
                {plan?.startupName || 'Untitled Startup'}
              </h1>
              {plan?.usp && (
                <p className="text-lg sm:text-xl font-medium text-indigo-600 dark:text-indigo-400 break-words">
                  {plan.usp}
                </p>
              )}
            </div>

            {elevatorPitch && (
              <div className={`p-5 sm:p-6 rounded-2xl border ${
                isDark ? 'bg-gray-900/60 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">Executive Thesis</p>
                <p className="text-base sm:text-lg italic leading-relaxed break-words">
                  "{elevatorPitch}"
                </p>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: PROBLEM, SOLUTION & TARGET AUDIENCE */}
        <section className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Core Value Proposition</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Market pain and strategic solution</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Problem */}
            <div className={`p-6 rounded-2xl shadow-md border ${
              isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center space-x-2.5 mb-3 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-lg">The Problem</h3>
              </div>
              <p className={`text-sm sm:text-base leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {plan?.problem || 'Problem statement not specified.'}
              </p>
            </div>

            {/* Solution */}
            <div className={`p-6 rounded-2xl shadow-md border ${
              isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center space-x-2.5 mb-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-lg">The Proposed Solution</h3>
              </div>
              <p className={`text-sm sm:text-base leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {plan?.solution || 'Solution not specified.'}
              </p>
            </div>

            {/* Target Audience */}
            <div className={`p-6 rounded-2xl shadow-md border ${
              isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center space-x-2.5 mb-3 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-lg">Target Audience</h3>
              </div>
              <p className={`text-sm sm:text-base leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {plan?.targetAudience || 'Target audience not specified.'}
              </p>
            </div>

            {/* Unique Advantage (USP) */}
            <div className={`p-6 rounded-2xl shadow-md border ${
              isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center space-x-2.5 mb-3 text-purple-600 dark:text-purple-400">
                <Zap className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-lg">Competitive Advantage</h3>
              </div>
              <p className={`text-sm sm:text-base leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {plan?.usp || 'Unique advantage not specified.'}
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: LEAN CANVAS (9-Box Business Model) */}
        {plan?.leanCanvas && Object.keys(plan.leanCanvas).length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Lean Canvas</h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>9-box strategic model visualization</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.entries(plan.leanCanvas).map(([key, value], idx) => {
                const label = key.replace(/([A-Z])/g, ' $1').trim();
                return (
                  <div
                    key={key}
                    className={`p-5 rounded-2xl shadow-md border ${
                      isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 capitalize">
                        {label}
                      </h3>
                      <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                    </div>

                    {Array.isArray(value) ? (
                      <ul className="space-y-2">
                        {value.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start space-x-2 text-xs sm:text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
                            <span className={`break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {typeof item === 'string' ? item : JSON.stringify(item)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={`text-xs sm:text-sm leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 4: MVP ROADMAP */}
        {plan?.mvp && (
          <section className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-white">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">MVP Roadmap</h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Product development & launch milestones</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Core Features */}
              <div className={`md:col-span-2 p-6 rounded-2xl shadow-md border ${
                isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h3 className="font-bold text-lg mb-4 flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-amber-500" />
                  <span>Core Launch Features</span>
                </h3>

                {Array.isArray(plan.mvp.coreFeatures) && plan.mvp.coreFeatures.length > 0 ? (
                  <div className="space-y-3">
                    {plan.mvp.coreFeatures.map((feat, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl flex items-start space-x-3 ${
                          isDark ? 'bg-gray-900/60' : 'bg-gray-50'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className={`text-sm leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {typeof feat === 'string' ? feat : feat?.feature || JSON.stringify(feat)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Core features not detailed.
                  </p>
                )}
              </div>

              {/* Technical Scope & Timeline */}
              <div className="space-y-6">
                {plan.mvp.launchTimeline && (
                  <div className={`p-6 rounded-2xl shadow-md border ${
                    isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <h4 className="font-bold text-sm uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center space-x-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Launch Timeline</span>
                    </h4>
                    <p className={`text-sm leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {plan.mvp.launchTimeline}
                    </p>
                  </div>
                )}

                {plan.mvp.technicalRequirements && (
                  <div className={`p-6 rounded-2xl shadow-md border ${
                    isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <h4 className="font-bold text-sm uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center space-x-1.5">
                      <Brain className="w-4 h-4" />
                      <span>Technical Architecture</span>
                    </h4>
                    <p className={`text-sm leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {plan.mvp.technicalRequirements}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 5: REVENUE & MONETIZATION */}
        {Array.isArray(plan?.revenue) && plan.revenue.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Revenue & Monetization</h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Business model & pricing streams</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plan.revenue.map((stream, idx) => (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl shadow-md border ${
                    isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-sm font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    {stream.projection && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {stream.projection}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-lg text-emerald-600 dark:text-emerald-400 mb-2 break-words">
                    {stream.model || `Revenue Stream ${idx + 1}`}
                  </h3>

                  <p className={`text-sm leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {stream.description || 'Description not provided.'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 6: USER PERSONAS */}
        {Array.isArray(plan?.personas) && plan.personas.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center text-white">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Target User Personas</h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Customer profiles, motivations & pain points</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {plan.personas.map((persona, idx) => (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl shadow-md border ${
                    isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shrink-0">
                      {persona.name ? persona.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-purple-600 dark:text-purple-400 break-words">
                        {persona.name || `Persona ${idx + 1}`}
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {persona.occupation || persona.role || 'Target User'} {persona.age ? `• ${persona.age} yrs` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-sm">
                    {persona.goals && (
                      <div>
                        <span className="text-xs uppercase font-semibold text-gray-400 block mb-1">Primary Goals</span>
                        <p className={`leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {persona.goals}
                        </p>
                      </div>
                    )}
                    {persona.painPoints && (
                      <div>
                        <span className="text-xs uppercase font-semibold text-gray-400 block mb-1">Pain Points</span>
                        <p className={`leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {persona.painPoints}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 7: COMPETITIVE ANALYSIS */}
        {Array.isArray(plan?.competitors) && plan.competitors.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 flex items-center justify-center text-white">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Competitive Benchmark</h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Market alternatives & differentiation</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plan.competitors.map((comp, idx) => (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl shadow-md border ${
                    isDark ? 'bg-gray-800/70 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <h3 className="font-bold text-lg text-rose-600 dark:text-rose-400 mb-2 break-words">
                    {comp.name || `Competitor ${idx + 1}`}
                  </h3>

                  {comp.weakness && (
                    <div className="mb-3">
                      <span className="text-xs uppercase font-semibold text-gray-400 block mb-1">Observed Weakness</span>
                      <p className={`text-sm leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {comp.weakness}
                      </p>
                    </div>
                  )}

                  {comp.differentiator && (
                    <div>
                      <span className="text-xs uppercase font-semibold text-emerald-500 block mb-1">Our Advantage</span>
                      <p className={`text-sm leading-relaxed break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {comp.differentiator}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION 8: VIRAL FOOTER / FOUNDER CALL TO ACTION */}
        <section className={`rounded-3xl p-8 sm:p-12 text-center shadow-xl border relative overflow-hidden ${
          isDark 
            ? 'bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border-indigo-900/60' 
            : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100'
        }`}>
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Create Your Own Startup Business Plan
            </h2>
            <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Turn your startup idea into an investor-ready business execution plan in minutes with AI.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/start')}
                className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 transition-all hover:scale-105"
              >
                <span>Generate Startup Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Public Disclaimer */}
        <footer className="text-center text-xs text-gray-400 dark:text-gray-500 pt-6 pb-12">
          <p>© {new Date().getFullYear()} StartupAI • Confidential Business Plan Document • Powered by Generative AI</p>
        </footer>
      </main>
    </div>
  );
};

/**
 * PublicHeader
 * 
 * Minimalist, presentation-friendly header for public visitors.
 * Provides logo brand link, theme toggle, and creation CTA without exposing owner/auth controls.
 */
const PublicHeader = ({ navigate, isDark, toggleTheme }) => {
  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${
      isDark ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors focus:outline-none"
        >
          <Lightbulb className="w-6 h-6" />
          <span>StartupAI</span>
        </button>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* CTA */}
          <button
            onClick={() => navigate('/start')}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Create Plan
          </button>
        </div>
      </div>
    </header>
  );
};

export default SharedPlanPage;
