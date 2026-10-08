// frontend/src/components/AuthModal.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mail, Lock, User, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const AuthModal = ({
  isOpen,
  onClose,
  title = '',
  subtitle = '',
  onSuccess = null,
  isDark = false
}) => {
  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const googleBtnContainerRef = useRef(null);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
      setIsGoogleSubmitting(false);
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setError(null);
    }
  }, [isOpen]);

  // Handle Google OAuth Credential response from GIS
  const handleGoogleCredentialResponse = useCallback(async (response) => {
    if (!response || !response.credential) {
      setError('Google authentication was cancelled or returned no credentials.');
      setIsGoogleSubmitting(false);
      return;
    }

    setIsGoogleSubmitting(true);
    setError(null);
    try {
      const res = await loginWithGoogle(response.credential);
      if (onSuccess) {
        await onSuccess(res.user);
      }
      onClose();
    } catch (err) {
      console.error('[AuthModal] Google authentication failed:', err.message);
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [loginWithGoogle, onSuccess, onClose]);

  // Initialize Google Identity Services (GIS) if client ID is configured
  useEffect(() => {
    if (!isOpen) return;

    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!googleClientId) return;

    const setupGis = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            cancel_on_tap_outside: true,
            auto_select: false
          });

          if (googleBtnContainerRef.current) {
            window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
              theme: isDark ? 'filled_black' : 'outline',
              size: 'large',
              type: 'standard',
              shape: 'rectangular',
              text: 'continue_with',
              logo_alignment: 'center',
              width: 320
            });
          }
        } catch (gisInitErr) {
          console.warn('[AuthModal] Failed to initialize Google Sign-In:', gisInitErr.message);
        }
      }
    };

    if (window.google?.accounts?.id) {
      setupGis();
    } else {
      const existingScript = document.getElementById('google-gsi-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = setupGis;
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener('load', setupGis);
      }
    }
  }, [isOpen, isDark, handleGoogleCredentialResponse]);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting && !isGoogleSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, isGoogleSubmitting, onClose]);

  if (!isOpen) return null;

  // Custom click handler for Google button
  const handleGoogleClick = () => {
    if (isGoogleSubmitting || isSubmitting) return;

    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      setError('Google Sign-In is not configured for this environment (REACT_APP_GOOGLE_CLIENT_ID is missing). Please continue with Email below.');
      return;
    }

    if (window.google?.accounts?.id) {
      setIsGoogleSubmitting(true);
      setError(null);
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setIsGoogleSubmitting(false);
        }
      });
    } else {
      setError('Google Sign-In service is currently loading. Please try again in a moment or use email.');
    }
  };

  // Email form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isGoogleSubmitting) return;

    setError(null);

    // Form validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (mode === 'signup') {
        res = await signupWithEmail(trimmedEmail, password, name.trim() || undefined);
      } else {
        res = await loginWithEmail(trimmedEmail, password);
      }

      if (onSuccess) {
        await onSuccess(res.user);
      }
      onClose();
    } catch (err) {
      console.error('[AuthModal] Authentication error:', err.message);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayTitle = title || (mode === 'signup' ? 'Create an Account' : 'Welcome Back');
  const displaySubtitle = subtitle || (mode === 'signup' ? 'Sign up to save, manage, and export your startup plans.' : 'Sign in to access and manage your startup plans.');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting && !isGoogleSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl border transition-all transform ${
          isDark
            ? 'bg-gray-900 border-gray-800 text-white'
            : 'bg-white border-gray-200 text-gray-900'
        } p-6 sm:p-8 max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">StartupAI Account</span>
            </div>
            <h2 id="auth-modal-title" className="text-2xl font-bold tracking-tight">
              {displayTitle}
            </h2>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {displaySubtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting || isGoogleSubmitting}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            } disabled:opacity-50`}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className={`mb-6 p-3.5 rounded-xl flex items-start space-x-3 text-sm border animate-shake ${
              isDark
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
            role="alert"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs sm:text-sm">{error}</div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-medium hover:underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Primary Action: Continue with Google */}
        <div className="mb-6">
          <div ref={googleBtnContainerRef} className="hidden" aria-hidden="true" />
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isSubmitting || isGoogleSubmitting}
            className={`w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl font-medium border text-sm transition-all shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              isDark
                ? 'bg-gray-800/90 border-gray-700 text-gray-100 hover:bg-gray-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isGoogleSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <GoogleIcon />
            )}
            <span>
              {isGoogleSubmitting
                ? 'Connecting to Google...'
                : 'Continue with Google'}
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className={`absolute inset-0 flex items-center`}>
            <div className={`w-full border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`} />
          </div>
          <span
            className={`relative px-3 text-xs font-medium uppercase tracking-wider ${
              isDark ? 'bg-gray-900 text-gray-500' : 'bg-white text-gray-400'
            }`}
          >
            or with email
          </span>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex rounded-xl p-1 mb-5 bg-gray-100 dark:bg-gray-800">
          <button
            type="button"
            data-testid="auth-mode-signin"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? isDark
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-900 shadow-sm'
                : isDark
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            data-testid="auth-mode-signup"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? isDark
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-900 shadow-sm'
                : isDark
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label
                htmlFor="auth-name"
                className={`block text-xs font-medium mb-1.5 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Full Name (optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Founder"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  } disabled:opacity-60`}
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className={`block text-xs font-medium mb-1.5 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="founder@startup.com"
                required
                disabled={isSubmitting || isGoogleSubmitting}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                } disabled:opacity-60`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="auth-password"
                className={`block text-xs font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Password
              </label>
              {mode === 'signup' && (
                <span className="text-[11px] text-gray-500">Min. 8 characters</span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={mode === 'signup' ? 8 : undefined}
                disabled={isSubmitting || isGoogleSubmitting}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                } disabled:opacity-60`}
              />
            </div>
          </div>

          <button
            type="submit"
            data-testid="auth-submit-btn"
            disabled={isSubmitting || isGoogleSubmitting}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed text-sm mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
                </span>
              </>
            ) : (
              <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          {mode === 'signin' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
