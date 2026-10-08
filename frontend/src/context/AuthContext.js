// frontend/src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { formatAuthError } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalConfig, setAuthModalConfig] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    onAuthSuccess: null
  });

  // Session restoration on startup: inspect HTTP-only session cookie via GET /api/auth/me
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/api/auth/me');
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
        return res.data.data.user;
      } else {
        setUser(null);
        return null;
      }
    } catch (err) {
      // 401 UNAUTHORIZED or network failure -> clean unauthenticated state
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Email & Password login
  const loginWithEmail = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
        return { success: true, user: res.data.data.user };
      }
      throw new Error('Unexpected login response from server.');
    } catch (err) {
      const friendlyMessage = formatAuthError(err);
      const customErr = new Error(friendlyMessage);
      customErr.original = err;
      customErr.code = err.response?.data?.error?.code;
      throw customErr;
    }
  };

  // Email & Password signup
  const signupWithEmail = async (email, password, name) => {
    try {
      const res = await api.post('/api/auth/signup', { email, password, name });
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
        return { success: true, user: res.data.data.user };
      }
      throw new Error('Unexpected signup response from server.');
    } catch (err) {
      const friendlyMessage = formatAuthError(err);
      const customErr = new Error(friendlyMessage);
      customErr.original = err;
      customErr.code = err.response?.data?.error?.code;
      throw customErr;
    }
  };

  // Google OAuth credential login
  const loginWithGoogle = async (credential) => {
    try {
      const res = await api.post('/api/auth/google', { credential });
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
        return { success: true, user: res.data.data.user };
      }
      throw new Error('Unexpected Google authentication response from server.');
    } catch (err) {
      const friendlyMessage = formatAuthError(err);
      const customErr = new Error(friendlyMessage);
      customErr.original = err;
      customErr.code = err.response?.data?.error?.code;
      throw customErr;
    }
  };

  // Logout: destroy session server-side and clear client user state
  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.warn('[Auth] Server logout notification error (clearing local state anyway):', err.message);
    } finally {
      setUser(null);
    }
  };

  // Claim current anonymous plan into authenticated user account
  const claimCurrentPlan = async (planId) => {
    if (!planId) {
      throw new Error('Cannot claim plan: Plan ID is missing.');
    }
    try {
      const res = await api.post('/api/plans/claim', { planId });
      if (res.data?.success && res.data?.data) {
        return { success: true, plan: res.data.data };
      }
      throw new Error('Unexpected response format when claiming plan.');
    } catch (err) {
      const friendlyMessage = formatAuthError(err);
      const customErr = new Error(friendlyMessage);
      customErr.original = err;
      customErr.code = err.response?.data?.error?.code;
      throw customErr;
    }
  };

  // Modal open helper with contextual overrides
  const openAuthModal = useCallback(({ title = '', subtitle = '', onAuthSuccess = null } = {}) => {
    setAuthModalConfig({
      isOpen: true,
      title,
      subtitle,
      onAuthSuccess
    });
  }, []);

  // Modal close helper
  const closeAuthModal = useCallback(() => {
    setAuthModalConfig(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    logout,
    refreshUser,
    claimCurrentPlan,
    authModalConfig,
    openAuthModal,
    closeAuthModal
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
