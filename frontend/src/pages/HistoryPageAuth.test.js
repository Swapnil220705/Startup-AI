import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HistoryPage from './HistoryPage';
import { AuthProvider } from '../context/AuthContext';
import api from '../services/api';

jest.mock('../services/api');

describe('HistoryPage Authentication States', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders polished sign-in state for anonymous visitor', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/api/auth/me') return Promise.reject({ response: { status: 401 } });
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    render(
      <AuthProvider>
        <HistoryPage navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Your startup plans will appear here')).toBeInTheDocument();
    });

    expect(screen.getByText(/Sign in to save, manage, and revisit your startup plans/i)).toBeInTheDocument();
    // Do not call /api/plans when anonymous
    expect(api.get).not.toHaveBeenCalledWith('/api/plans', expect.anything());
  });

  test('loads and renders user plans when authenticated', async () => {
    const mockPlans = [
      {
        id: 'plan-101',
        startupName: 'NeuralFlow',
        industry: 'Developer Tools',
        problem: 'AI dev workflow is fragmented',
        generationStatus: 'completed',
        createdAt: '2026-10-01T12:00:00Z'
      }
    ];

    api.get.mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          data: { success: true, data: { user: { id: 'usr-42', email: 'dev@neuralflow.io' } } }
        });
      }
      if (url === '/api/plans') {
        return Promise.resolve({
          data: {
            success: true,
            data: { plans: mockPlans, total: 1, limit: 6, offset: 0 }
          }
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    render(
      <AuthProvider>
        <HistoryPage navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('NeuralFlow')).toBeInTheDocument();
    });

    expect(screen.getByText('Developer Tools')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/api/plans', expect.objectContaining({ params: { limit: 6, offset: 0 } }));
  });
});
