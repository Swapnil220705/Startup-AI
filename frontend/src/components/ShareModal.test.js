// frontend/src/components/ShareModal.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareModal from './ShareModal';
import { ExportTab } from './DashboardTabs';
import DashboardPage from '../pages/DashboardPage';
import { AuthProvider } from '../context/AuthContext';
import api from '../services/api';

jest.mock('../services/api');

describe('ShareModal & Share Management UX (Phase 5.5)', () => {
  const planId = 'test-plan-uuid-123';
  const planName = 'QuantumPulse AI';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 14: Authenticated owner can open share-management interface
  test('14: Authenticated owner can open share-management interface and view private state', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { isActive: false }
      }
    });

    render(
      <ShareModal
        isOpen={true}
        onClose={jest.fn()}
        planId={planId}
        planName={planName}
        isDark={false}
      />
    );

    expect(screen.getByText(/Checking share status\.\.\./i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/This startup plan is currently private\./i)).toBeInTheDocument();
    });

    expect(screen.getByText('QuantumPulse AI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Share Link/i })).toBeInTheDocument();
  });

  // Test 15: Anonymous trial user is prompted to authenticate/claim first
  test('15: Anonymous trial user clicking share is prompted to authenticate/claim first', async () => {
    const AuthModal = require('./AuthModal').default;
    const { useAuth } = require('../context/AuthContext');

    const TestAuthContainer = () => {
      const { authModalConfig, closeAuthModal } = useAuth();
      return (
        <>
          <DashboardPage navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} currentPath="/dashboard" />
          <AuthModal
            isOpen={authModalConfig.isOpen}
            onClose={closeAuthModal}
            title={authModalConfig.title}
            subtitle={authModalConfig.subtitle}
            isDark={false}
          />
        </>
      );
    };

    localStorage.clear();
    localStorage.setItem('currentPlanId', 'trial-plan-uuid-777');
    localStorage.setItem('planPersistenceStatus', 'saved');
    localStorage.setItem('formData', JSON.stringify({
      name: 'Trial Co', domain: 'Tech', problem: 'Prob', solution: 'Sol'
    }));

    // Mock unauthenticated user
    api.get.mockImplementation((url) => {
      if (url === '/api/auth/me') return Promise.reject({ response: { status: 401 } });
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    render(
      <AuthProvider>
        <TestAuthContainer />
      </AuthProvider>
    );

    // Wait for Dashboard to render
    const shareBtn = await screen.findByRole('button', { name: /Share/i });
    expect(shareBtn).toBeInTheDocument();

    fireEvent.click(shareBtn);

    // Should prompt authentication modal with specific title
    await waitFor(() => {
      expect(screen.getByText(/Sign In to Share Plan/i)).toBeInTheDocument();
    });
  });

  // Test 16: Create action displays the resulting URL
  test('16: Create action calls POST /api/plans/:id/share and displays the resulting URL', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { isActive: false }
      }
    });

    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 'share-1',
          planId,
          token: 'abc123token',
          url: '/share/abc123token',
          isActive: true,
          viewCount: 0,
          createdAt: new Date().toISOString()
        }
      }
    });

    render(
      <ShareModal
        isOpen={true}
        onClose={jest.fn()}
        planId={planId}
        planName={planName}
        isDark={false}
      />
    );

    const createBtn = await screen.findByRole('button', { name: /Create Share Link/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(`/api/plans/${planId}/share`);
      expect(screen.getByText(/Public Sharing Active/i)).toBeInTheDocument();
    });

    const urlInput = screen.getByLabelText(/Public share URL/i);
    expect(urlInput.value).toContain('/share/abc123token');
  });

  // Test 17: Copy action handles success and failure
  test('17: Copy action copies link and provides visual feedback', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          isActive: true,
          share: {
            id: 'share-1',
            planId,
            token: 'validtoken777',
            url: '/share/validtoken777',
            isActive: true,
            viewCount: 4,
            createdAt: new Date().toISOString()
          }
        }
      }
    });

    // Mock navigator.clipboard
    const mockWriteText = jest.fn().mockResolvedValue();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText
      }
    });

    render(
      <ShareModal
        isOpen={true}
        onClose={jest.fn()}
        planId={planId}
        planName={planName}
        isDark={false}
      />
    );

    const copyBtn = await screen.findByRole('button', { name: /Copy Link/i });
    fireEvent.click(copyBtn);

    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('/share/validtoken777'));
    await waitFor(() => {
      expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
    });
  });

  // Test 18: Reopening the interface recovers an existing URL
  test('18: Reopening the interface recovers existing active URL without calling POST', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          isActive: true,
          share: {
            id: 'share-recovered',
            planId,
            token: 'recovered-secret-token',
            url: '/share/recovered-secret-token',
            isActive: true,
            viewCount: 12,
            createdAt: '2026-10-10T00:00:00.000Z'
          }
        }
      }
    });

    render(
      <ShareModal
        isOpen={true}
        onClose={jest.fn()}
        planId={planId}
        planName={planName}
        isDark={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Public Sharing Active/i)).toBeInTheDocument();
    });

    const urlInput = screen.getByLabelText(/Public share URL/i);
    expect(urlInput.value).toContain('/share/recovered-secret-token');
    expect(screen.getByText(/12 views/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  // Test 19: Legacy link requires explicit replacement confirmation
  test('19: Legacy active link without recoverable token prompts for replacement', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          isActive: true,
          share: {
            id: 'legacy-share',
            planId,
            isActive: true,
            viewCount: 8,
            createdAt: '2026-10-09T00:00:00.000Z',
            requiresReplacement: true
          }
        }
      }
    });

    render(
      <ShareModal
        isOpen={true}
        onClose={jest.fn()}
        planId={planId}
        planName={planName}
        isDark={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Existing Active Share Link \(Legacy Version\)/i)).toBeInTheDocument();
    });

    const replaceBtn = screen.getByRole('button', { name: /Replace with Fresh Link/i });
    fireEvent.click(replaceBtn);

    // Displays confirmation prompt
    expect(screen.getByText(/Replacing will invalidate the previous legacy URL/i)).toBeInTheDocument();

    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 'fresh-share',
          planId,
          token: 'newfreshkey888',
          url: '/share/newfreshkey888',
          isActive: true,
          viewCount: 0,
          replaced: true
        }
      }
    });

    const confirmReplaceBtn = screen.getByRole('button', { name: /Yes, Replace Link/i });
    fireEvent.click(confirmReplaceBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(`/api/plans/${planId}/share`, { replace: true });
      expect(screen.getByText(/Public Sharing Active/i)).toBeInTheDocument();
    });

    const urlInput = screen.getByLabelText(/Public share URL/i);
    expect(urlInput.value).toContain('/share/newfreshkey888');
  });

  // Test 20: Revoke action requires confirmation
  test('20: Revoke action requires confirmation before invalidating link', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          isActive: true,
          share: {
            id: 'share-to-revoke',
            planId,
            token: 'tokentorevoke',
            url: '/share/tokentorevoke',
            isActive: true,
            viewCount: 2
          }
        }
      }
    });

    render(
      <ShareModal
        isOpen={true}
        onClose={jest.fn()}
        planId={planId}
        planName={planName}
        isDark={false}
      />
    );

    const revokePromptBtn = await screen.findByRole('button', { name: /Revoke Link/i });
    fireEvent.click(revokePromptBtn);

    expect(screen.getByText(/Anyone using this link will immediately lose access\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keep Link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yes, Revoke Link/i })).toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
  });

  // Test 21: Revocation updates UI only after server confirmation
  test('21: Revocation updates UI only after server confirms success', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          isActive: true,
          share: {
            id: 'share-to-revoke',
            planId,
            token: 'tokentorevoke',
            url: '/share/tokentorevoke',
            isActive: true,
            viewCount: 2
          }
        }
      }
    });

    render(
      <ShareModal
        isOpen={true}
        onClose={jest.fn()}
        planId={planId}
        planName={planName}
        isDark={false}
      />
    );

    const revokePromptBtn = await screen.findByRole('button', { name: /Revoke Link/i });
    fireEvent.click(revokePromptBtn);

    api.delete.mockResolvedValueOnce({
      data: {
        success: true,
        data: { revoked: true }
      }
    });

    const confirmRevokeBtn = screen.getByRole('button', { name: /Yes, Revoke Link/i });
    fireEvent.click(confirmRevokeBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/api/plans/${planId}/share`);
      expect(screen.getByText(/Public Sharing is Disabled/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Create New Share Link/i })).toBeInTheDocument();
  });

  // Test 22: Network failures display useful retry behavior
  test('22: Network failure displays retryable error state', async () => {
    api.get.mockRejectedValueOnce({
      response: {
        status: 500,
        data: { error: { message: 'Server connection timeout.' } }
      }
    });

    render(
      <ShareModal
        isOpen={true}
        onClose={jest.fn()}
        planId={planId}
        planName={planName}
        isDark={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Connection Issue/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Try Again/i });
    expect(retryBtn).toBeInTheDocument();

    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { isActive: false }
      }
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(/This startup plan is currently private\./i)).toBeInTheDocument();
    });
  });

  // Test 23: Switching plans does not show stale link details
  test('23: Switching plans re-initializes and fetches new plan status', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          isActive: true,
          share: {
            id: 'share-plan-1',
            planId: 'plan-1',
            token: 'plan1token',
            url: '/share/plan1token',
            isActive: true,
            viewCount: 10
          }
        }
      }
    });

    const { rerender } = render(
      <ShareModal
        isOpen={true}
        onClose={jest.fn()}
        planId="plan-1"
        planName="Plan One"
        isDark={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Public share URL/i).value).toContain('/share/plan1token');
    });

    // Rerender with plan-2
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { isActive: false }
      }
    });

    rerender(
      <ShareModal
        isOpen={true}
        onClose={jest.fn()}
        planId="plan-2"
        planName="Plan Two"
        isDark={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/This startup plan is currently private\./i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/Public share URL/i)).not.toBeInTheDocument();
  });

  // Test 24: Existing PDF export UI remains functional
  test('24: Existing PDF export UI in ExportTab remains functional alongside Share Link', () => {
    const mockNavigate = jest.fn();
    const mockOpenShare = jest.fn();
    const mockData = {
      overview: { name: 'HealthPulse', domain: 'HealthTech' },
      leanCanvas: {},
      mvp: {},
      revenue: [],
      pitch: {},
      personas: [],
      competitors: []
    };

    render(
      <ExportTab
        data={mockData}
        navigate={mockNavigate}
        isDark={false}
        onOpenShare={mockOpenShare}
      />
    );

    // Business Plan PDF export button exists
    expect(screen.getByRole('button', { name: /Export PDF/i })).toBeInTheDocument();

    // Pitch deck navigation button exists
    const pitchBtn = screen.getByRole('button', { name: /Open Pitch Deck & Export/i });
    expect(pitchBtn).toBeInTheDocument();
    fireEvent.click(pitchBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/pitch-preview');

    // Share Online button exists and triggers onOpenShare
    const shareBtn = screen.getByRole('button', { name: /Manage Link/i });
    expect(shareBtn).toBeInTheDocument();
    fireEvent.click(shareBtn);
    expect(mockOpenShare).toHaveBeenCalled();
  });
});
