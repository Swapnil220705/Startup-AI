import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../services/api';

jest.mock('../services/api');

const TestConsumer = ({ onAction }) => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="auth-loading">{auth.isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="auth-user">{auth.user ? auth.user.email : 'null'}</div>
      <div data-testid="auth-status">{auth.isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <button onClick={() => auth.loginWithEmail('test@example.com', 'password123')}>Login</button>
      <button onClick={() => auth.signupWithEmail('new@example.com', 'password123', 'New User')}>Signup</button>
      <button onClick={() => auth.loginWithGoogle('mock-id-token')}>Google</button>
      <button onClick={() => auth.logout()}>Logout</button>
      <button onClick={() => auth.claimCurrentPlan('plan-uuid-123')}>Claim</button>
    </div>
  );
};

describe('AuthContext and AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('restores session when GET /api/auth/me succeeds', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 'usr-1', email: 'restored@example.com', name: 'Restored User' }
        }
      }
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('ready');
    });

    expect(screen.getByTestId('auth-user').textContent).toBe('restored@example.com');
    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(api.get).toHaveBeenCalledWith('/api/auth/me');
  });

  test('sets unauthenticated when GET /api/auth/me fails (401)', async () => {
    api.get.mockRejectedValueOnce({
      response: { status: 401, data: { error: { code: 'UNAUTHORIZED' } } }
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('ready');
    });

    expect(screen.getByTestId('auth-user').textContent).toBe('null');
    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
  });

  test('loginWithEmail sets user state on success', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 401 } });
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 'usr-2', email: 'test@example.com', name: 'Test User' }
        }
      }
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth-loading').textContent).toBe('ready'));

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('auth-user').textContent).toBe('test@example.com');
    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
  });

  test('signupWithEmail sets user state on success', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 401 } });
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 'usr-3', email: 'new@example.com', name: 'New User' }
        }
      }
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth-loading').textContent).toBe('ready'));

    await act(async () => {
      screen.getByText('Signup').click();
    });

    expect(screen.getByTestId('auth-user').textContent).toBe('new@example.com');
    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
  });

  test('loginWithGoogle sets user state on success', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 401 } });
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 'usr-4', email: 'google@example.com', name: 'Google User' }
        }
      }
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth-loading').textContent).toBe('ready'));

    await act(async () => {
      screen.getByText('Google').click();
    });

    expect(screen.getByTestId('auth-user').textContent).toBe('google@example.com');
    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
  });

  test('logout clears user state', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { user: { id: 'usr-1', email: 'user@example.com' } }
      }
    });
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth-user').textContent).toBe('user@example.com'));

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('auth-user').textContent).toBe('null');
    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
  });

  test('claimCurrentPlan calls POST /api/plans/claim', async () => {
    api.get.mockResolvedValueOnce({
      data: { success: true, data: { user: { id: 'usr-1', email: 'user@example.com' } } }
    });
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: 'plan-uuid-123', userId: 'usr-1', startupName: 'Claimed Startup' }
      }
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth-loading').textContent).toBe('ready'));

    await act(async () => {
      screen.getByText('Claim').click();
    });

    expect(api.post).toHaveBeenCalledWith('/api/plans/claim', { planId: 'plan-uuid-123' });
  });
});
