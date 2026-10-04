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
  FileText,
  Edit3,
  Trash2,
  X
} from 'lucide-react';
import Header from '../components/Header';

const HistoryPage = ({ navigate, isDark, toggleTheme }) => {
  const [plans, setPlans] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 6; // 6 cards per page for a balanced grid
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete modal state
  const [planToDelete, setPlanToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Edit modal state
  const [planToEdit, setPlanToEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    startupName: '',
    industry: '',
    problem: '',
    solution: '',
    targetAudience: '',
    usp: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  // Action feedback alert
  const [actionFeedback, setActionFeedback] = useState(null);

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
    if (plan && plan.id) {
      navigate(`/dashboard?plan=${encodeURIComponent(plan.id)}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleStartEdit = (plan) => {
    setPlanToEdit(plan);
    setEditError(null);
    setEditForm({
      startupName: plan.startupName || '',
      industry: plan.industry || '',
      problem: plan.problem || '',
      solution: plan.solution || '',
      targetAudience: plan.targetAudience || '',
      usp: plan.usp || ''
    });
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!planToEdit) return;

    if (!editForm.startupName.trim()) {
      setEditError('Startup Name is required.');
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const res = await axios.patch(`http://localhost:4000/api/plans/${planToEdit.id}`, {
        startupName: editForm.startupName.trim(),
        industry: editForm.industry.trim(),
        problem: editForm.problem.trim(),
        solution: editForm.solution.trim(),
        targetAudience: editForm.targetAudience.trim(),
        usp: editForm.usp.trim()
      });

      if (res.data?.success && res.data?.data) {
        const updated = res.data.data;
        // Update in plans list
        setPlans(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));

        // If this edited plan is the currently open plan, synchronize localStorage formData
        const activePlanId = localStorage.getItem('currentPlanId');
        if (activePlanId === updated.id) {
          const currentFormData = JSON.parse(localStorage.getItem('formData') || '{}');
          const updatedFormData = {
            ...currentFormData,
            name: updated.startupName,
            domain: updated.industry,
            problem: updated.problem,
            solution: updated.solution,
            audience: updated.targetAudience,
            usp: updated.usp
          };
          localStorage.setItem('formData', JSON.stringify(updatedFormData));
        }

        setPlanToEdit(null);
        setActionFeedback({ type: 'success', message: `Plan "${updated.startupName}" updated successfully.` });
        setTimeout(() => setActionFeedback(null), 4000);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      console.error('[History] Error updating plan:', err.message);
      setEditError(err.response?.data?.error?.message || 'Failed to update plan. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await axios.delete(`http://localhost:4000/api/plans/${planToDelete.id}`);
      if (res.data?.success) {
        const deletedId = planToDelete.id;
        const deletedName = planToDelete.startupName;

        // If this plan is the currently open plan, purge active session keys
        const activePlanId = localStorage.getItem('currentPlanId');
        if (activePlanId === deletedId) {
          const PLAN_STORAGE_KEYS = [
            'formData',
            'leanCanvas',
            'mvp',
            'revenue',
            'pitch',
            'personas',
            'competitors',
            'generationErrors',
            'currentPlanId',
            'planPersistenceStatus'
          ];
          PLAN_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
        }

        // Update local list
        const remainingPlans = plans.filter(p => p.id !== deletedId);
        setPlans(remainingPlans);
        const newTotal = Math.max(0, total - 1);
        setTotal(newTotal);

        setPlanToDelete(null);
        setActionFeedback({ type: 'success', message: `Plan "${deletedName}" was deleted.` });
        setTimeout(() => setActionFeedback(null), 4000);

        // If the current page is now empty and we're not on the first page, navigate to previous page
        if (remainingPlans.length === 0 && offset > 0) {
          const newOffset = Math.max(0, offset - limit);
          fetchPlans(newOffset);
        }
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      console.error('[History] Error deleting plan:', err.message);
      setDeleteError(err.response?.data?.error?.message || 'Failed to delete plan. Please try again.');
    } finally {
      setIsDeleting(false);
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
  const activePlanId = typeof window !== 'undefined' ? localStorage.getItem('currentPlanId') : null;

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
              Browse, manage, and review your saved AI-generated business plans and briefs.
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

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className={`p-4 rounded-xl mb-6 flex items-center justify-between shadow-sm transition-all duration-300 ${
            actionFeedback.type === 'success'
              ? isDark ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : isDark ? 'bg-rose-950/40 border border-rose-800 text-rose-300' : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{actionFeedback.message}</span>
            </div>
            <button 
              onClick={() => setActionFeedback(null)} 
              className="p-1 rounded hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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

                  {/* Card Footer with Lifecycle Actions */}
                  <div className={`pt-4 border-t ${isDark ? 'border-gray-700/60' : 'border-gray-100'} flex items-center justify-between mt-2`}>
                    <div className={`flex items-center text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Calendar className="w-3.5 h-3.5 mr-1 opacity-70" />
                      <span>{formatDate(plan.createdAt)}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleStartEdit(plan)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDark ? 'text-gray-400 hover:text-indigo-400 hover:bg-gray-700/50' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'
                        }`}
                        title="Edit metadata"
                        aria-label={`Edit ${plan.startupName}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setPlanToDelete(plan);
                          setDeleteError(null);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDark ? 'text-gray-400 hover:text-rose-400 hover:bg-rose-950/30' : 'text-gray-500 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title="Delete plan"
                        aria-label={`Delete ${plan.startupName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenPlan(plan)}
                        className="inline-flex items-center space-x-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 group/btn pl-1"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
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

        {/* Delete Confirmation Modal */}
        {planToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${
              isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
            }`}>
              <div className="flex items-start space-x-3 mb-4">
                <div className={`p-2 rounded-xl flex-shrink-0 ${
                  isDark ? 'bg-rose-950/50 text-rose-400' : 'bg-rose-100 text-rose-600'
                }`}>
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Delete Startup Plan?</h3>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Are you sure you want to delete <span className="font-semibold text-indigo-500">"{planToDelete.startupName}"</span>? This will permanently delete the plan from the database.
                  </p>
                </div>
              </div>

              {activePlanId === planToDelete.id && (
                <div className={`p-3 rounded-xl text-xs mb-4 border ${
                  isDark ? 'bg-amber-950/30 border-amber-800/60 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <span className="font-bold">Active Session Note:</span> This plan is currently open on your Dashboard. Deleting it will clear the active dashboard session.
                </div>
              )}

              {deleteError && (
                <div className="p-3 rounded-xl text-xs mb-4 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setPlanToDelete(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    isDark ? 'border-gray-700 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Metadata Modal */}
        {planToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl my-8 ${
              isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-950/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">Edit Startup Plan</h3>
                </div>
                <button
                  onClick={() => setPlanToEdit(null)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className={`text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Update core business metadata. Generated AI modules (Lean Canvas, MVP, Pitch) remain unchanged.
              </p>

              {editError && (
                <div className="p-3 rounded-xl text-xs mb-4 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
                  {editError}
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                    Startup Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.startupName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, startupName: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Startup Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                    Industry / Domain
                  </label>
                  <input
                    type="text"
                    value={editForm.industry}
                    onChange={(e) => setEditForm(prev => ({ ...prev, industry: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="e.g. FinTech, HealthTech, B2B SaaS"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                    Problem Statement
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.problem}
                    onChange={(e) => setEditForm(prev => ({ ...prev, problem: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="What problem does this startup solve?"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                    Solution
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.solution}
                    onChange={(e) => setEditForm(prev => ({ ...prev, solution: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="How does your product solve the problem?"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={editForm.targetAudience}
                    onChange={(e) => setEditForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="e.g. Remote product teams, College students"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                    Unique Selling Proposition (USP)
                  </label>
                  <input
                    type="text"
                    value={editForm.usp}
                    onChange={(e) => setEditForm(prev => ({ ...prev, usp: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Key differentiator"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setPlanToEdit(null)}
                    disabled={isSavingEdit}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      isDark ? 'border-gray-700 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    {isSavingEdit ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;