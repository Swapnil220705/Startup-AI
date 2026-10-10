// frontend/src/components/ShareModal.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  Calendar, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Lock, 
  Globe, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

/**
 * ShareModal
 * 
 * Secure share management modal for authenticated plan owners.
 * Supports:
 * - Status inspection and existing-link recovery
 * - New link creation
 * - One-click clipboard copy with graceful fallback
 * - View count and creation date metrics
 * - Revocation with confirmation
 * - Explicit replacement for legacy unrecoverable tokens
 * - Retryable network error states
 */
const ShareModal = ({ isOpen, onClose, planId, planName, isDark }) => {
  // States: 'loading' | 'no_share' | 'active' | 'legacy_active' | 'revoked' | 'network_error'
  const [status, setStatus] = useState('loading');
  const [shareData, setShareData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Sub-actions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingRevoke, setIsConfirmingRevoke] = useState(false);
  const [isConfirmingReplace, setIsConfirmingReplace] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);

  // Fetch current share status
  const loadShareStatus = useCallback(async () => {
    if (!planId) return;

    setStatus('loading');
    setErrorMessage(null);
    setIsConfirmingRevoke(false);
    setIsConfirmingReplace(false);
    setCopySuccess(false);
    setManualCopy(false);

    try {
      const res = await api.get(`/api/plans/${planId}/share`);
      if (res.data?.success && res.data?.data) {
        const payload = res.data.data;
        if (payload.isActive && payload.share) {
          setShareData(payload.share);
          if (payload.share.requiresReplacement) {
            setStatus('legacy_active');
          } else {
            setStatus('active');
          }
        } else {
          setShareData(null);
          setStatus('no_share');
        }
      } else {
        setStatus('no_share');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // Plan or share not found
        setShareData(null);
        setStatus('no_share');
      } else {
        setErrorMessage(
          err.response?.data?.error?.message || 
          'Unable to check share status. Please verify your connection and try again.'
        );
        setStatus('network_error');
      }
    }
  }, [planId]);

  // Load status on modal open
  useEffect(() => {
    if (isOpen && planId) {
      loadShareStatus();
    }
  }, [isOpen, planId, loadShareStatus]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Create new share link
  const handleCreateShare = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post(`/api/plans/${planId}/share`);
      if (res.data?.success && res.data?.data) {
        setShareData(res.data.data);
        setStatus('active');
      } else {
        throw new Error('Unexpected response format.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 
        'Failed to generate share link. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Replace legacy/active link
  const handleReplaceShare = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post(`/api/plans/${planId}/share`, { replace: true });
      if (res.data?.success && res.data?.data) {
        setShareData(res.data.data);
        setIsConfirmingReplace(false);
        setStatus('active');
      } else {
        throw new Error('Unexpected response format during link replacement.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 
        'Failed to replace share link. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revoke active share
  const handleRevokeShare = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.delete(`/api/plans/${planId}/share`);
      if (res.data?.success && res.data?.data?.revoked) {
        setShareData(null);
        setIsConfirmingRevoke(false);
        setStatus('revoked');
      } else {
        throw new Error('Failed to confirm revocation.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.error?.message || 
        'Failed to revoke share link. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe clipboard copy
  const handleCopy = () => {
    if (!shareData?.url) return;

    const fullUrl = window.location.origin + shareData.url;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullUrl)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2500);
        })
        .catch(() => {
          setManualCopy(true);
        });
    } else {
      setManualCopy(true);
    }
  };

  if (!isOpen) return null;

  const fullShareUrl = shareData?.url ? `${window.location.origin}${shareData.url}` : '';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div 
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-gray-700 bg-gray-850' : 'border-gray-100 bg-gray-50/50'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl ${
              isDark ? 'bg-indigo-950/60 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
            }`}>
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="share-modal-title" className="text-base font-bold">
                Share Startup Plan
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate max-w-xs`}>
                {planName || 'Startup Execution Plan'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            aria-label="Close share modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Action Feedback / Error Banner */}
          {errorMessage && (
            <div className={`mb-5 p-3.5 rounded-xl text-xs flex items-start space-x-2.5 ${
              isDark ? 'bg-rose-950/50 border border-rose-800 text-rose-300' : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
              <button 
                onClick={() => setErrorMessage(null)} 
                className="opacity-70 hover:opacity-100 text-sm leading-none ml-2"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* STATE 1: LOADING */}
          {status === 'loading' && (
            <div className="py-10 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Checking share status...
              </p>
            </div>
          )}

          {/* STATE 2: NO ACTIVE SHARE (PRIVATE) */}
          {status === 'no_share' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex items-start space-x-3.5 ${
                isDark ? 'bg-gray-750 border-gray-700 text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <Lock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold text-sm mb-1 text-inherit">
                    This startup plan is currently private.
                  </p>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                    Generating a share link creates a public, read-only presentation URL that anyone can view without logging in.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Globe className="w-4 h-4" />
                  <span>Public read-only executive view</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <Lock className="w-4 h-4" />
                  <span>Your account credentials and private notes stay hidden</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCreateShare}
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Share Link...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Create Share Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STATE 3: ACTIVE SHARE */}
          {status === 'active' && shareData && (
            <div className="space-y-5">
              {/* Active Status Badge & Metrics */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Public Sharing Active</span>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <div className={`flex items-center space-x-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{shareData.viewCount || 0} {shareData.viewCount === 1 ? 'view' : 'views'}</span>
                  </div>
                  {shareData.createdAt && (
                    <div className={`flex items-center space-x-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(shareData.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* URL Input with Copy Button */}
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Shareable Link
                </label>
                <div className="flex items-stretch space-x-2">
                  <div className={`flex-1 relative flex items-center rounded-xl border px-3 py-2 text-xs font-mono overflow-hidden ${
                    isDark ? 'bg-gray-900/80 border-gray-700 text-indigo-300' : 'bg-gray-50 border-gray-200 text-indigo-600'
                  }`}>
                    <input 
                      type="text" 
                      readOnly 
                      value={fullShareUrl}
                      className="w-full bg-transparent border-0 outline-none text-xs font-mono select-all"
                      aria-label="Public share URL"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition-all shadow-sm ${
                      copySuccess 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                    title="Copy public link to clipboard"
                  >
                    {copySuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                {manualCopy && (
                  <p className="mt-1.5 text-xs text-amber-500">
                    Automatic copy unavailable. Press Ctrl+C (Cmd+C) to copy the highlighted link.
                  </p>
                )}
              </div>

              {/* Action Buttons: Open & Revoke */}
              {!isConfirmingRevoke ? (
                <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-700/60">
                  <a
                    href={fullShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center space-x-1 text-xs font-medium ${
                      isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                    }`}
                  >
                    <span>Preview Public Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsConfirmingRevoke(true)}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
                  >
                    Revoke Link
                  </button>
                </div>
              ) : (
                /* Inline Revocation Confirmation */
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-rose-950/30 border-rose-900/60 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-start space-x-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      Anyone using this link will immediately lose access. Are you sure you want to revoke it?
                    </p>
                  </div>
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingRevoke(false)}
                      disabled={isSubmitting}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        isDark ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      Keep Link
                    </button>
                    <button
                      type="button"
                      onClick={handleRevokeShare}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                    >
                      {isSubmitting ? 'Revoking...' : 'Yes, Revoke Link'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATE 4: LEGACY ACTIVE SHARE (UNRECOVERABLE TOKEN) */}
          {status === 'legacy_active' && shareData && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
                isDark ? 'bg-amber-950/30 border-amber-800/80 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1.5">
                  <p className="font-semibold text-sm">
                    Existing Active Share Link (Legacy Version)
                  </p>
                  <p className="opacity-90 leading-relaxed">
                    This link was created prior to encrypted token recovery. Your existing shared link remains active for visitors who have it ({shareData.viewCount || 0} views recorded), but its raw URL cannot be safely retrieved from the database.
                  </p>
                </div>
              </div>

              {!isConfirmingReplace ? (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingReplace(true)}
                    className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Replace with Fresh Link</span>
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      Keep old link active or revoke it permanently:
                    </span>
                    <button
                      type="button"
                      onClick={handleRevokeShare}
                      disabled={isSubmitting}
                      className="text-rose-600 dark:text-rose-400 hover:underline font-medium"
                    >
                      Revoke Legacy Link
                    </button>
                  </div>
                </div>
              ) : (
                /* Inline Replace Confirmation */
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-amber-950/40 border-amber-800 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <p className="text-xs leading-relaxed font-medium">
                    Replacing will invalidate the previous legacy URL and generate a fresh, copyable link. Anyone using the old link will lose access. Continue?
                  </p>
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingReplace(false)}
                      disabled={isSubmitting}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        isDark ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleReplaceShare}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                    >
                      {isSubmitting ? 'Replacing...' : 'Yes, Replace Link'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATE 5: REVOKED */}
          {status === 'revoked' && (
            <div className="space-y-4 text-center py-4">
              <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
                isDark ? 'bg-gray-750 text-gray-400' : 'bg-gray-100 text-gray-500'
              }`}>
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">Public Sharing is Disabled</h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} max-w-xs mx-auto`}>
                  The previous link has been revoked and is no longer accessible to public visitors.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCreateShare}
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create New Share Link</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 6: NETWORK / RETRYABLE ERROR */}
          {status === 'network_error' && (
            <div className="space-y-4 text-center py-4">
              <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${
                isDark ? 'bg-rose-950/40 text-rose-400' : 'bg-rose-100 text-rose-600'
              }`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">Connection Issue</h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} max-w-xs mx-auto`}>
                  Unable to connect with the server. Please check your connection and try again.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={loadShareStatus}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs ${
          isDark ? 'border-gray-700/60 bg-gray-850 text-gray-400' : 'border-gray-100 bg-gray-50/50 text-gray-500'
        }`}>
          <span>Public visitors can view without logging in</span>
          <button
            type="button"
            onClick={onClose}
            className={`font-medium hover:underline ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
