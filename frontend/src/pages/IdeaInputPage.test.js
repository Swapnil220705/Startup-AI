import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IdeaInputPage from './IdeaInputPage';
import api from '../services/api';

jest.mock('../services/api');

const mockOpenAuthModal = jest.fn();
let mockAuthValue = {
  isAuthenticated: false,
  user: null,
  openAuthModal: mockOpenAuthModal,
  closeAuthModal: jest.fn()
};

jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: () => mockAuthValue
}));

describe('IdeaInputPage — Chunk 6.3 Pre-Flight Trial Check & AI Quota Protection', () => {
  const initialFormData = {
    name: 'QuantumAI',
    domain: 'Artificial Intelligence',
    problem: 'Model fine-tuning takes too much GPU compute.',
    solution: 'Quantized distributed compiler for edge hardware.',
    audience: 'ML Engineers and Research Labs',
    usp: '10x faster training on commodity hardware',
    summary: 'Cutting edge optimization tool'
  };

  let mockNavigate;
  let mockSetFormData;
  let mockSetIsLoading;
  let originalAlert;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    originalAlert = window.alert;
    window.alert = jest.fn();

    mockNavigate = jest.fn();
    mockSetFormData = jest.fn();
    mockSetIsLoading = jest.fn();

    mockAuthValue = {
      isAuthenticated: false,
      user: null,
      openAuthModal: mockOpenAuthModal,
      closeAuthModal: jest.fn()
    };
  });

  afterEach(() => {
    window.alert = originalAlert;
  });

  test('1. Anonymous user with trial available proceeds to 6 AI generation endpoints', async () => {
    // Pre-flight check says trial is available
    api.get.mockImplementation((url) => {
      if (url === '/api/plans/trial-status') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              allowed: true,
              authenticated: false,
              trialExhausted: false,
              hasTrialSession: false,
              message: 'Anonymous free trial available.'
            }
          }
        });
      }
      return Promise.reject(new Error(`Unexpected GET: ${url}`));
    });

    // Mock successful 6 parallel AI endpoints and persistence
    api.post.mockImplementation((url) => {
      if (url === '/api/plans') {
        return Promise.resolve({
          data: {
            success: true,
            data: { id: 'new-plan-123' }
          }
        });
      }
      return Promise.resolve({
        data: {
          key: url.replace('/api/', ''),
          generatedContent: 'Sample module data'
        }
      });
    });

    render(
      <IdeaInputPage
        navigate={mockNavigate}
        formData={initialFormData}
        setFormData={mockSetFormData}
        isLoading={false}
        setIsLoading={mockSetIsLoading}
        isDark={false}
        toggleTheme={jest.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /generate business plan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Pre-flight check was called
      expect(api.get).toHaveBeenCalledWith('/api/plans/trial-status');
      // All 6 AI endpoints were called
      expect(api.post).toHaveBeenCalledWith('/api/lean-canvas', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/mvp', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/revenue', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/pitch', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/personas', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/competitors', expect.any(Object));
      // Auth modal was NOT opened
      expect(mockOpenAuthModal).not.toHaveBeenCalled();
      // Navigation to dashboard succeeded
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('2. Anonymous user with exhausted trial triggers ZERO AI generation calls and opens AuthModal', async () => {
    // Pre-flight check says trial is exhausted
    api.get.mockImplementation((url) => {
      if (url === '/api/plans/trial-status') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              allowed: false,
              authenticated: false,
              trialExhausted: true,
              hasTrialSession: true,
              message: 'Anonymous free trial has already been used. Please sign in or create an account to generate more plans.'
            }
          }
        });
      }
      return Promise.reject(new Error(`Unexpected GET: ${url}`));
    });

    api.post.mockImplementation(() => Promise.resolve({ data: {} }));

    render(
      <IdeaInputPage
        navigate={mockNavigate}
        formData={initialFormData}
        setFormData={mockSetFormData}
        isLoading={false}
        setIsLoading={mockSetIsLoading}
        isDark={false}
        toggleTheme={jest.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /generate business plan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Pre-flight status was requested
      expect(api.get).toHaveBeenCalledWith('/api/plans/trial-status');
      // Auth modal was opened with clear explanation
      expect(mockOpenAuthModal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Free Trial Already Used',
          subtitle: expect.stringContaining('already been used')
        })
      );
      // ZERO AI POST calls dispatched!
      expect(api.post).not.toHaveBeenCalled();
      // Navigation did NOT occur
      expect(mockNavigate).not.toHaveBeenCalled();
      // Loading flag was reset
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });

    // Form inputs and entered values are preserved in the DOM
    expect(screen.getByDisplayValue('QuantumAI')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Model fine-tuning takes too much/i)).toBeInTheDocument();
  });

  test('3. Authenticated user proceeds directly without anonymous trial blocking', async () => {
    mockAuthValue = {
      isAuthenticated: true,
      user: { id: 'usr_premium', email: 'founder@startup.com' },
      openAuthModal: mockOpenAuthModal,
      closeAuthModal: jest.fn()
    };

    api.post.mockImplementation((url) => {
      if (url === '/api/plans') {
        return Promise.resolve({ data: { success: true, data: { id: 'auth-plan-456' } } });
      }
      return Promise.resolve({ data: { test: true } });
    });

    render(
      <IdeaInputPage
        navigate={mockNavigate}
        formData={initialFormData}
        setFormData={mockSetFormData}
        isLoading={false}
        setIsLoading={mockSetIsLoading}
        isDark={false}
        toggleTheme={jest.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /generate business plan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Preflight trial check for anonymous was not needed
      expect(api.get).not.toHaveBeenCalledWith('/api/plans/trial-status');
      // All 6 AI endpoints were fired
      expect(api.post).toHaveBeenCalledWith('/api/lean-canvas', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/mvp', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/revenue', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/pitch', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/personas', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/competitors', expect.any(Object));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('4. Network failure on pre-flight check halts process and prevents AI calls', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/api/plans/trial-status') {
        return Promise.reject(new Error('Network connection timeout'));
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <IdeaInputPage
        navigate={mockNavigate}
        formData={initialFormData}
        setFormData={mockSetFormData}
        isLoading={false}
        setIsLoading={mockSetIsLoading}
        isDark={false}
        toggleTheme={jest.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /generate business plan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/plans/trial-status');
      // Window alert was shown with retryable message
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Unable to verify trial availability')
      );
      // Zero AI requests dispatched
      expect(api.post).not.toHaveBeenCalled();
      // Loading flag cleared
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      // Modal not opened
      expect(mockOpenAuthModal).not.toHaveBeenCalled();
    });
  });

  test('5. Duplicate submission is ignored when isLoading is true', async () => {
    render(
      <IdeaInputPage
        navigate={mockNavigate}
        formData={initialFormData}
        setFormData={mockSetFormData}
        isLoading={true}
        setIsLoading={mockSetIsLoading}
        isDark={false}
        toggleTheme={jest.fn()}
      />
    );

    // When isLoading is true, loading screen is displayed
    expect(screen.getByText(/Analyzing your startup idea/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });
});
