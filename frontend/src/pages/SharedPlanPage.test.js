// frontend/src/pages/SharedPlanPage.test.js
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SharedPlanPage from './SharedPlanPage';
import App from '../App';
import api from '../services/api';

jest.mock('../services/api');

describe('SharedPlanPage — Phase 5.4 Public Presentation Page', () => {
  const sampleSanitizedPlan = {
    id: 'plan-share-1234',
    startupName: 'ApexMetrics AI',
    industry: 'Analytics & Growth',
    problem: 'Founders spend too much time calculating customer cohort retention manually.',
    solution: 'AI-automated cohort analysis and churn prediction directly from Stripe events.',
    targetAudience: 'Early-stage SaaS founders, product leads, and growth marketers.',
    usp: 'Instant cohort insights with zero ETL or manual data engineering.',
    leanCanvas: {
      problem: 'Manual spreadsheet retention tracking',
      solution: 'Automated ML retention models',
      uniqueValueProposition: 'Cohort retention in 30 seconds',
      unfairAdvantage: 'Proprietary Stripe data models',
      customerSegments: 'B2B SaaS companies with >$10k MRR',
      keyMetrics: 'Net Revenue Retention (NRR), Churn rate',
      channels: 'Direct sales, Product Hunt, AppSumo',
      costStructure: 'Hosting, LLM API tokens, Stripe fees',
      revenueStreams: 'Tiered monthly SaaS subscription'
    },
    mvp: {
      coreFeatures: [
        'Stripe webhook ingest pipeline',
        'Cohort retention matrix heatmap',
        'Real-time automated churn alerts'
      ],
      technicalRequirements: 'Node.js, PostgreSQL/SQLite, Tailwind CSS, Redis queue',
      launchTimeline: 'Alpha in 4 weeks, Public Beta in 8 weeks'
    },
    revenue: [
      {
        model: 'Pro Plan',
        description: 'For growing startups up to 10k monthly active users',
        projection: '$99 / month'
      },
      {
        model: 'Enterprise Plan',
        description: 'Dedicated infrastructure, custom SLAs, unlimited team seats',
        projection: '$499 / month'
      }
    ],
    pitch: {
      elevatorPitch: 'ApexMetrics turns Stripe logs into actionable retention cohorts automatically in seconds.'
    },
    personas: [
      {
        name: 'SaaS Samantha',
        role: 'Head of Growth',
        occupation: 'Growth Lead at Series A startup',
        age: '32',
        goals: 'Improve cohort retention and reduce customer churn',
        painPoints: 'Manually wrestling with messy CSV exports from payment gateways'
      }
    ],
    competitors: [
      {
        name: 'Mixpanel',
        weakness: 'Requires complex custom instrumentation and developer hours',
        differentiator: 'One-click native Stripe connection with zero setup'
      }
    ],
    createdAt: '2026-10-09T01:30:00.000Z',
    updatedAt: '2026-10-09T01:35:00.000Z'
  };

  const rawTestToken = 'e4a2d8f1b6c0739e1a5f4c8b2d6e0a3f5c7b9d1e3a5f7c9b1d3e5a7f9c1b3d5e';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();

    // Default mock for /api/auth/me (unauthenticated visitor)
    api.get.mockImplementation((url) => {
      if (url === '/api/auth/me') {
        return Promise.reject({ response: { status: 401 } });
      }
      if (url.includes(`/api/shared/${rawTestToken}`)) {
        return Promise.resolve({ data: { success: true, data: sampleSanitizedPlan } });
      }
      return Promise.reject({ response: { status: 404 } });
    });
  });

  afterEach(() => {
    // Clean up any remaining meta robots tag from head
    const meta = document.querySelector('meta[name="robots"]');
    if (meta) meta.remove();
  });

  // TEST 1: Valid token fetches and renders shared plan
  test('1. Valid token fetches and renders a shared plan with all primary sections', async () => {
    render(<SharedPlanPage token={rawTestToken} navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />);

    // Shows loading initially
    expect(screen.getByText(/Loading Shared Plan/i)).toBeInTheDocument();

    // Waits for plan content
    await waitFor(() => {
      expect(screen.getByText('ApexMetrics AI')).toBeInTheDocument();
    });

    // Check primary sections
    expect(screen.getByText('Analytics & Growth')).toBeInTheDocument();
    expect(screen.getByText(/Founders spend too much time calculating customer cohort retention/i)).toBeInTheDocument();
    expect(screen.getByText(/AI-automated cohort analysis and churn prediction/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Instant cohort insights with zero ETL/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Lean Canvas/i)).toBeInTheDocument();
    expect(screen.getByText(/MVP Roadmap/i)).toBeInTheDocument();
    expect(screen.getByText(/Revenue & Monetization/i)).toBeInTheDocument();
    expect(screen.getByText(/Target User Personas/i)).toBeInTheDocument();
    expect(screen.getByText(/Competitive Benchmark/i)).toBeInTheDocument();
  });

  // TEST 2: Unauthenticated visitors can view plan without login redirect
  test('2. Unauthenticated visitors can view a valid plan without being redirected to login', async () => {
    const mockNavigate = jest.fn();
    render(<SharedPlanPage token={rawTestToken} navigate={mockNavigate} isDark={false} toggleTheme={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('ApexMetrics AI')).toBeInTheDocument();
    });

    // Verify navigate was never called to redirect to /login or /start
    expect(mockNavigate).not.toHaveBeenCalled();
    // Verify no login modal or prompt is forced
    expect(screen.queryByText(/Sign in to your account/i)).not.toBeInTheDocument();
  });

  // TEST 3: Loading state is rendered
  test('3. Loading state is rendered while data is being fetched', () => {
    // Unresolved promise
    api.get.mockImplementation(() => new Promise(() => {}));

    render(<SharedPlanPage token={rawTestToken} navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />);

    expect(screen.getByText(/Loading Shared Plan/i)).toBeInTheDocument();
    expect(screen.getByText(/Retrieving the executive business presentation/i)).toBeInTheDocument();
  });

  // TEST 4: Invalid token displays neutral unavailable message
  test('4. Invalid token displays the neutral unavailable message', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 404 } });

    render(<SharedPlanPage token="non-existent-or-invalid-token" navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Plan Unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/This shared plan is unavailable\. The link may have expired or been revoked\./i)).toBeInTheDocument();
    // Must NOT leak database or internal info
    expect(screen.queryByText(/SQLite/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/token/i)).not.toBeInTheDocument();
  });

  // TEST 5: Revoked token displays the same neutral unavailable message
  test('5. Revoked token displays the exact same neutral unavailable message (uniformity)', async () => {
    // Backend returns identical 404 for revoked shares
    api.get.mockRejectedValueOnce({
      response: {
        status: 404,
        data: { success: false, error: { code: 'SHARE_NOT_FOUND', message: 'Shared plan not found or link has expired.' } }
      }
    });

    render(<SharedPlanPage token="revoked-token-123456" navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Plan Unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/This shared plan is unavailable\. The link may have expired or been revoked\./i)).toBeInTheDocument();
  });

  // TEST 6: Network failure displays retryable error
  test('6. Network failure displays a retryable error message', async () => {
    api.get.mockRejectedValueOnce(new Error('Network Error'));

    render(<SharedPlanPage token={rawTestToken} navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Connection Problem/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    // Must NOT claim link was expired or invalid
    expect(screen.queryByText(/The link may have expired or been revoked/i)).not.toBeInTheDocument();
  });

  // TEST 7: Retry initiates another request
  test('7. Clicking Retry initiates another network request', async () => {
    api.get.mockRejectedValueOnce(new Error('Network Error'));

    render(<SharedPlanPage token={rawTestToken} navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Connection Problem/i)).toBeInTheDocument();
    });

    // Mock next request to succeed
    api.get.mockResolvedValueOnce({ data: { success: true, data: sampleSanitizedPlan } });

    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

    await waitFor(() => {
      expect(screen.getByText('ApexMetrics AI')).toBeInTheDocument();
    });
  });

  // TEST 8: Missing optional modules do not crash the page
  test('8. Missing optional modules (null or empty) render gracefully without crashing', async () => {
    const minimalPlan = {
      id: 'minimal-plan',
      startupName: 'BareBones AI',
      industry: 'AI Utilities',
      problem: 'Need simple solution',
      solution: 'Provided simple solution',
      targetAudience: 'General public',
      usp: 'Super simple',
      leanCanvas: null,
      mvp: null,
      revenue: null,
      pitch: null,
      personas: null,
      competitors: null,
      createdAt: '2026-10-09T01:00:00.000Z',
      updatedAt: null
    };

    api.get.mockResolvedValueOnce({ data: { success: true, data: minimalPlan } });

    render(<SharedPlanPage token="minimal-token" navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('BareBones AI')).toBeInTheDocument();
    });

    expect(screen.getByText('Need simple solution')).toBeInTheDocument();
    expect(screen.getByText('Provided simple solution')).toBeInTheDocument();
    // Sections for missing modules should not be rendered
    expect(screen.queryByRole('heading', { name: /Lean Canvas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /MVP Roadmap/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Target User Personas/i })).not.toBeInTheDocument();
  });

  // TEST 9: Public content does not render owner/session/internal error fields
  test('9. Public content strictly omits user_id, email, session, or internal error fields', async () => {
    render(<SharedPlanPage token={rawTestToken} navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('ApexMetrics AI')).toBeInTheDocument();
    });

    const bodyText = document.body.textContent;
    expect(bodyText).not.toContain('user_id');
    expect(bodyText).not.toContain('userId');
    expect(bodyText).not.toContain('generationErrors');
    expect(bodyText).not.toContain('generation_errors');
    expect(bodyText).not.toContain('session');
    expect(bodyText).not.toContain('plan-share-1234'); // Database ID should not be exposed
  });

  // TEST 10: Page contains no editing, deleting, or owner-only controls
  test('10. Page contains no editing, deleting, claiming, or owner-only action buttons', async () => {
    render(<SharedPlanPage token={rawTestToken} navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('ApexMetrics AI')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Edit Plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Delete Plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Save Plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Claim Plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Share Link/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/My Plans/i)).not.toBeInTheDocument();
  });

  // TEST 11: Long text and empty collections render safely
  test('11. Long strings and empty arrays render safely without breaking layout', async () => {
    const edgePlan = {
      id: 'edge-plan',
      startupName: 'A'.repeat(120),
      industry: 'Enterprise Software',
      problem: 'Very long problem description '.repeat(40),
      solution: 'https://extremely-long-unbroken-url-example.com/some/deep/resource/path/that/must/wrap/properly',
      targetAudience: 'Global Fortune 500 Enterprises',
      usp: 'UnbrokenVeryLongUniqueSellingPropositionTokenWithoutAnySpacesHereToTestWordBreakSafety',
      leanCanvas: {},
      mvp: { coreFeatures: [] },
      revenue: [],
      pitch: { elevatorPitch: 'B'.repeat(300) },
      personas: [],
      competitors: []
    };

    api.get.mockResolvedValueOnce({ data: { success: true, data: edgePlan } });

    render(<SharedPlanPage token="edge-token" navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('A'.repeat(120))).toBeInTheDocument();
    });

    expect(screen.getByText(/https:\/\/extremely-long-unbroken-url/i)).toBeInTheDocument();
  });

  // TEST 12: Route integrates through App.js without breaking navigation
  test('12. The /share/:token route correctly integrates into the main App router', async () => {
    // Set window.location pathname to /share/:token
    window.history.pushState({}, '', `/share/${rawTestToken}`);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('ApexMetrics AI')).toBeInTheDocument();
    });

    // Brand logo should still be present
    expect(screen.getByText('StartupAI')).toBeInTheDocument();

    // Clicking StartupAI brand logo navigates back to landing page
    fireEvent.click(screen.getByText('StartupAI'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
  });

  // TEST 13: Search-engine metadata discourages indexing (noindex, nofollow, noarchive)
  test('13. Injects noindex, nofollow, noarchive meta tag into head on mount and cleans up on unmount', async () => {
    const { unmount } = render(<SharedPlanPage token={rawTestToken} navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />);

    const meta = document.querySelector('meta[name="robots"]');
    expect(meta).not.toBeNull();
    expect(meta.getAttribute('content')).toBe('noindex, nofollow, noarchive');

    unmount();

    // After unmount, tag is cleaned up or reset
    const metaAfter = document.querySelector('meta[name="robots"]');
    expect(metaAfter).toBeNull();
  });

  // TEST 14: No raw token is written to localStorage or sessionStorage
  test('14. The page never writes the raw share token or plan data to localStorage or sessionStorage', async () => {
    render(<SharedPlanPage token={rawTestToken} navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('ApexMetrics AI')).toBeInTheDocument();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('shareToken')).toBeNull();
    expect(localStorage.getItem('currentPlanId')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();

    // Check all keys in localStorage/sessionStorage
    expect(Object.keys(localStorage).length).toBe(0);
    expect(Object.keys(sessionStorage).length).toBe(0);
  });
});
