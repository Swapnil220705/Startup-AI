import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Lightbulb, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  FileText 
} from 'lucide-react';
import Header from '../components/Header';

const HistoryPage = ({ navigate, isDark, toggleTheme }) => {
  const [plans, setPlans] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 6; // 6 cards per page for a balanced grid
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlans = useCallback(async (targetOffset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('http://localhost:4000/api/plans', {
        params: {
          limit,
          offset: targetOffset
        }
      });

      if (res.data && res.data.success && res.data.data) {
        setPlans(res.data.data.plans || []);
        setTotal(res.data.data.total || 0);
        setOffset(res.data.data.offset || targetOffset);
      } else {
        throw new Error('Unexpected API response structure');
      }
    } catch (err) {
      console.error('[History] Error fetching plans:', err.message);
      setError('Unable to load saved plans from the database. Please verify that the backend server is running.');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPlans(0);
  }, [fetchPlans]);

  const handlePrevPage = () => {
    if (offset > 0 && !loading) {
      const newOffset = Math.max(0, offset - limit);
      fetchPlans(newOffset);
    }
  };

  const handleNextPage = () => {
    if (offset + limit < total && !loading) {
      const newOffset = offset + limit;
      fetchPlans(newOffset);
    }
  };

  const handleOpenPlan = (plan) => {
    // Chunk 3.4: Reopening persisted plan carries server-generated plan ID
    if (plan && plan.id) {
      navigate(`/dashboard?plan=${encodeURIComponent(plan.id)}`);
    } else {
      navigate('/dashboard');
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown date';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
            Completed
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100/80 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
            Partial
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100/80 text-rose-800 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600 dark:text-rose-400" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;
  const startCount = total === 0 ? 0 : offset + 1;
  const endCount = Math.min(offset + limit, total);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'} transition-colors duration-200`}>
      <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} showNavigation={true} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              My Startup Plans
            </h1>
            <p className={`mt-1 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Browse and review your saved AI-generated business plans and architectural briefs.
            </p>
          </div>
          <button
            onClick={() => navigate('/start')}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Plan</span>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 text-center">
            <RefreshCw className="w-10 h-10 mx-auto text-indigo-500 animate-spin mb-4" />
            <p className={`text-base font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Loading saved startup plans...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-rose-950/20 border-rose-800/60 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'} mb-8 shadow-sm`}>
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-1">Database Connection Error</h3>
                <p className="text-sm opacity-90 mb-4">{error}</p>
                <button
                  onClick={() => fetchPlans(offset)}
                  className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && plans.length === 0 && (
          <div className={`text-center py-20 px-4 rounded-3xl border ${isDark ? 'bg-gray-800/40 border-gray-800' : 'bg-white border-gray-200'} shadow-sm my-6`}>
            <div className={`w-20 h-20 mx-auto rounded-3xl ${isDark ? 'bg-gray-700/60 text-gray-400' : 'bg-indigo-50 text-indigo-500'} flex items-center justify-center mb-6`}>
              <Lightbulb className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Saved Plans Yet</h2>
            <p className={`max-w-md mx-auto text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-8`}>
              You haven't generated any startup plans yet. Submit a new startup concept to get full Lean Canvas, MVP, revenue models, and pitch deck.
            </p>
            <button
              onClick={() => navigate('/start')}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <span>Create Your First Plan</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Plans Grid */}
        {!loading && !error && plans.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`group flex flex-col justify-between p-6 rounded-2xl border transition-all duration-300 ${
                    isDark
                      ? 'bg-gray-800/70 border-gray-700/80 hover:border-indigo-500/50 hover:bg-gray-800'
                      : 'bg-white border-gray-200 hover:border-indigo-400 hover:shadow-xl'
                  } shadow-md`}
                >
                  <div>
                    {/* Top Row: Industry & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {plan.industry ? (
                        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md ${
                          isDark ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/60' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          <Layers className="w-3 h-3 mr-1 text-indigo-500" />
                          {plan.industry}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md ${
                          isDark ? 'bg-gray-700/60 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <FileText className="w-3 h-3 mr-1 opacity-70" />
                          Startup Plan
                        </span>
                      )}
                      <div>{renderStatusBadge(plan.generationStatus)}</div>
                    </div>

                    {/* Startup Name */}
                    <h3 className="text-xl font-bold tracking-tight mb-2 group-hover:text-indigo-500 transition-colors">
                      {plan.startupName}
                    </h3>

                    {/* Problem Description Preview */}
                    <p className={`text-sm line-clamp-3 mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {plan.problem || plan.solution || 'Comprehensive business plan generated with Startup-AI.'}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className={`pt-4 border-t ${isDark ? 'border-gray-700/60' : 'border-gray-100'} flex items-center justify-between mt-2`}>
                    <div className={`flex items-center text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Calendar className="w-3.5 h-3.5 mr-1 opacity-70" />
                      <span>{formatDate(plan.createdAt)}</span>
                    </div>

                    <button
                      onClick={() => handleOpenPlan(plan)}
                      className="inline-flex items-center space-x-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 group/btn"
                    >
                      <span>Open Plan</span>
                      <ArrowRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {total > 0 && (
              <div className={`mt-10 pt-6 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'} flex flex-col sm:flex-row items-center justify-between gap-4`}>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{startCount}</span> to{' '}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{endCount}</span> of{' '}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{total}</span> saved plans
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={handlePrevPage}
                    disabled={offset === 0 || loading}
                    className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      offset === 0 || loading
                        ? 'opacity-40 cursor-not-allowed border-gray-300 dark:border-gray-700 text-gray-400'
                        : isDark
                        ? 'border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </button>

                  <span className={`text-sm font-medium px-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={handleNextPage}
                    disabled={offset + limit >= total || loading}
                    className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      offset + limit >= total || loading
                        ? 'opacity-40 cursor-not-allowed border-gray-300 dark:border-gray-700 text-gray-400'
                        : isDark
                        ? 'border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
                    }`}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;