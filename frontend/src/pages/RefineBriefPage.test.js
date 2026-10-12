import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RefineBriefPage from './RefineBriefPage';
import api from '../services/api';

jest.mock('../services/api');

const mockAuthValue = {
  isAuthenticated: false,
  user: null,
  openAuthModal: jest.fn(),
  closeAuthModal: jest.fn()
};

jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: () => mockAuthValue
}));

describe('RefineBriefPage — Chunk 7.2 Startup Brief Refinement & Confirmation', () => {
  const sampleDraftBrief = {
    schemaVersion: 1,
    status: 'draft',
    rawInput: {
      name: 'NeuroFlow',
      domain: 'HealthTech',
      problem: 'Doctors spend 3 hours per day on charts',
      solution: 'Real-time AI ambient scribe',
      audience: 'Clinical physicians',
      usp: 'Zero-latency transcription',
      summary: 'Ambient clinician assistant'
    },
    facts: {
      startupName: 'NeuroFlow',
      industry: 'HealthTech',
      problem: 'Doctors spend 3 hours per day on charts',
      solution: 'Real-time AI ambient scribe',
      targetAudience: 'Clinical physicians',
      usp: 'Zero-latency transcription',
      summary: 'Ambient clinician assistant'
    },
    aiInterpretations: {
      category: 'Healthcare AI / B2B SaaS',
      businessModel: 'Subscription per clinician seat',
      targetMarketDynamics: 'High physician burnout, high EHR compliance requirements',
      coreValueProposition: 'Save 3 hours daily per doctor with clinical-grade ambient scribing'
    },
    assumptions: [
      {
        id: 'asm_1',
        statement: 'Exam rooms have functional microphones',
        category: 'Technical',
        confirmed: false,
        status: 'unverified'
      }
    ],
    clarificationQuestions: [
      {
        id: 'q_1',
        question: 'Which EHR platforms do your target clinics use primarily?',
        context: 'Defines initial integration priority (Epic, Cerner, or AthenaHealth)',
        answered: false,
        answer: '',
        founderAnswer: ''
      }
    ],
    metadata: {
      createdAt: '2026-10-12T00:00:00.000Z',
      updatedAt: '2026-10-12T00:00:00.000Z'
    }
  };

  let mockNavigate;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockNavigate = jest.fn();
    window.alert = jest.fn();
  });

  test('1. Renders draft brief successfully from localStorage with dimensions, interpretations, assumptions, and questions', () => {
    localStorage.setItem('draftBrief', JSON.stringify(sampleDraftBrief));

    render(
      <RefineBriefPage
        navigate={mockNavigate}
        isDark={false}
        toggleTheme={jest.fn()}
      />
    );

    // Header & Title
    expect(screen.getByText(/Review & Refine Your Startup Brief/i)).toBeInTheDocument();

    // AI Interpretations banner
    expect(screen.getByText('Healthcare AI / B2B SaaS')).toBeInTheDocument();
    expect(screen.getByText('Subscription per clinician seat')).toBeInTheDocument();

    // Fact Inputs
    expect(screen.getByDisplayValue('NeuroFlow')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doctors spend 3 hours per day on charts')).toBeInTheDocument();

    // Assumption
    expect(screen.getByText(/Exam rooms have functional microphones/i)).toBeInTheDocument();

    // Clarification Question
    expect(screen.getByText(/Which EHR platforms do your target clinics use primarily/i)).toBeInTheDocument();

    // Confirm & Generate button
    expect(screen.getByRole('button', { name: /confirm brief & generate all modules/i })).toBeInTheDocument();
  });

  test('2. Displays empty state when no draft brief is in localStorage', () => {
    render(
      <RefineBriefPage
        navigate={mockNavigate}
        isDark={false}
        toggleTheme={jest.fn()}
      />
    );

    expect(screen.getByText(/No Draft Brief Found/i)).toBeInTheDocument();
    const createBtn = screen.getByRole('button', { name: /enter startup idea/i });
    fireEvent.click(createBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/start');
  });

  test('3. Allows editing facts, answering questions, confirming assumptions, and confirming brief to generate all 6 modules', async () => {
    localStorage.setItem('draftBrief', JSON.stringify(sampleDraftBrief));

    // Mock successful 6 module calls and plan creation
    api.post.mockImplementation((url) => {
      if (url === '/api/plans') {
        return Promise.resolve({
          data: {
            success: true,
            data: { id: 'plan-brief-789' }
          }
        });
      }
      return Promise.resolve({
        data: {
          key: url.replace('/api/', ''),
          generatedContent: 'Valid Module Output'
        }
      });
    });

    render(
      <RefineBriefPage
        navigate={mockNavigate}
        isDark={false}
        toggleTheme={jest.fn()}
      />
    );

    // 1. Edit startup name
    const nameInput = screen.getByDisplayValue('NeuroFlow');
    fireEvent.change(nameInput, { target: { value: 'NeuroFlow Health' } });

    // 2. Answer clarification question
    const answerInput = screen.getByPlaceholderText(/Optional founder answer/i);
    fireEvent.change(answerInput, { target: { value: 'Epic and AthenaHealth' } });

    // 3. Confirm assumption toggle
    const confirmAssumptionBtn = screen.getByTitle(/Mark confirmed/i);
    fireEvent.click(confirmAssumptionBtn);

    // 4. Click Confirm & Generate
    const confirmBtn = screen.getByRole('button', { name: /confirm brief & generate all modules/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      // All 6 modules called with confirmed brief in payload
      expect(api.post).toHaveBeenCalledWith('/api/lean-canvas', expect.objectContaining({
        startupName: 'NeuroFlow Health',
        brief: expect.objectContaining({
          status: 'confirmed',
          facts: expect.objectContaining({
            startupName: 'NeuroFlow Health'
          })
        })
      }));
      expect(api.post).toHaveBeenCalledWith('/api/mvp', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/revenue', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/pitch', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/personas', expect.any(Object));
      expect(api.post).toHaveBeenCalledWith('/api/competitors', expect.any(Object));

      // Plan saved
      expect(api.post).toHaveBeenCalledWith('/api/plans', expect.objectContaining({
        startupName: 'NeuroFlow Health',
        brief: expect.objectContaining({
          status: 'confirmed'
        })
      }));

      // Saved in localStorage
      expect(localStorage.getItem('brief')).toBeTruthy();
      expect(localStorage.getItem('currentPlanId')).toBe('plan-brief-789');

      // Navigated to dashboard
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('4. Handles partial generation gracefully and still navigates to dashboard with errors stored', async () => {
    localStorage.setItem('draftBrief', JSON.stringify(sampleDraftBrief));

    // Mock 5 successes, 1 failure (e.g. pitch fails)
    api.post.mockImplementation((url) => {
      if (url === '/api/pitch') {
        return Promise.reject(new Error('AI rate limit overload'));
      }
      if (url === '/api/plans') {
        return Promise.resolve({
          data: {
            success: true,
            data: { id: 'plan-partial-555' }
          }
        });
      }
      return Promise.resolve({
        data: {
          key: url.replace('/api/', ''),
          content: 'Output'
        }
      });
    });

    render(
      <RefineBriefPage
        navigate={mockNavigate}
        isDark={false}
        toggleTheme={jest.fn()}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /confirm brief & generate all modules/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      // Pitch failed but plan still saved and navigation completed
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      const genErrors = JSON.parse(localStorage.getItem('generationErrors') || '{}');
      expect(genErrors.failedModules).toContain('Pitch Deck');
    });
  });
});
