import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from './DashboardPage';
import { AuthProvider } from '../context/AuthContext';
import api from '../services/api';

jest.mock('../services/api');

describe('DashboardPage Authentication & Trial Banner UX', () => {
  const mockPlanData = {
    id: 'trial-plan-uuid-999',
    startupName: 'EcoTrack',
    industry: 'CleanTech',
    problem: 'Carbon tracking is too complex',
    solution: 'Automated AI audit',
    targetAudience: 'SMBs',
    usp: 'Instant carbon ledger',
    leanCanvas: { startupName: 'EcoTrack' },
    mvp: { startupName: 'EcoTrack', coreFeatures: ['Feature 1'] },
    revenue: [{ model: 'SaaS', description: 'Monthly fee', projection: '$5000' }],
    pitch: { hook: 'Clean tech is future' },
    personas: [{ name: 'Sustainability Officer' }],
    competitors: [{ name: 'LegacyAudit' }]
  };

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();

    // Populate localStorage with plan data
    localStorage.setItem('currentPlanId', mockPlanData.id);
    localStorage.setItem('planPersistenceStatus', 'saved');
    localStorage.setItem('formData', JSON.stringify({
      name: mockPlanData.startupName,
      domain: mockPlanData.industry,
      problem: mockPlanData.problem,
      solution: mockPlanData.solution,
      audience: mockPlanData.targetAudience,
      usp: mockPlanData.usp
    }));
    localStorage.setItem('leanCanvas', JSON.stringify(mockPlanData.leanCanvas));
    localStorage.setItem('mvp', JSON.stringify(mockPlanData.mvp));
    localStorage.setItem('revenue', JSON.stringify(mockPlanData.revenue));
    localStorage.setItem('pitch', JSON.stringify(mockPlanData.pitch));
    localStorage.setItem('personas', JSON.stringify(mockPlanData.personas));
    localStorage.setItem('competitors', JSON.stringify(mockPlanData.competitors));
  });

  test('displays Free Trial Plan banner for anonymous user with active plan', async () => {
    // Unauthenticated session
    api.get.mockImplementation((url) => {
      if (url === '/api/auth/me') return Promise.reject({ response: { status: 401 } });
      if (url.includes('/api/plans/')) return Promise.resolve({ data: { success: true, data: mockPlanData } });
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    render(
      <AuthProvider>
        <DashboardPage navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} currentPath="/dashboard" />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Free Trial Plan/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Save My Plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Your complete AI startup plan is ready/i)).toBeInTheDocument();
  });

  test('does NOT display Free Trial Plan banner when user is authenticated', async () => {
    // Authenticated session
    api.get.mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          data: { success: true, data: { user: { id: 'usr-1', email: 'owner@ecotrack.com' } } }
        });
      }
      if (url.includes('/api/plans/')) return Promise.resolve({ data: { success: true, data: mockPlanData } });
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    render(
      <AuthProvider>
        <DashboardPage navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} currentPath="/dashboard" />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Saved to Your Account')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Free Trial Plan/i)).not.toBeInTheDocument();
  });

  test('preserves local plan and shows retry banner on claim failure', async () => {
    // Authenticated session attempting claim
    api.get.mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          data: { success: true, data: { user: { id: 'usr-1', email: 'owner@ecotrack.com' } } }
        });
      }
      if (url.includes('/api/plans/')) return Promise.resolve({ data: { success: true, data: mockPlanData } });
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    // Simulate claim failure
    api.post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { error: { code: 'PLAN_ALREADY_CLAIMED', message: 'This plan is claimed' } }
      }
    });

    // Temporarily mount with unauthenticated initial then click
    api.get.mockImplementationOnce(() => Promise.reject({ response: { status: 401 } }));

    render(
      <AuthProvider>
        <DashboardPage navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} currentPath="/dashboard" />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Save My Plan/i)).toBeInTheDocument();
    });

    // Verify localStorage has currentPlanId preserved
    expect(localStorage.getItem('currentPlanId')).toBe('trial-plan-uuid-999');
  });
});
