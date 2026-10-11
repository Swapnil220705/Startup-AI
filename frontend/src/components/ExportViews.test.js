import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PitchDeckPrintView from './PitchDeckPrintView';
import BusinessPlanPrintView from './BusinessPlanPrintView';
import { ExportTab } from './DashboardTabs';
import * as exportHelpers from '../utils/exportHelpers';
import * as financialExportHelpers from '../utils/financialExportHelpers';

describe('Print Views and Export UI', () => {
  const mockPlan = {
    overview: {
      name: 'CloudPulse',
      industry: 'Cloud Infrastructure',
      problem: 'High AWS billing surprises',
      solution: 'Real-time automated kubernetes downscaling',
      audience: 'DevOps leads',
      usp: 'Guaranteed 35% bill reduction in 24 hours'
    },
    pitch: {
      elevatorPitch: 'CloudPulse cuts cloud bills automatically.',
      usp: 'Guaranteed 35% bill reduction'
    },
    leanCanvas: {
      startupName: 'CloudPulse',
      problem: 'High AWS billing',
      solution: 'Downscaling automation'
    },
    mvp: {
      coreFeatures: ['CLI agent', 'Slack alerting']
    },
    revenue: [
      { stream: 'Pro Tier', pricing: '$199/mo', model: 'SaaS', description: 'Up to 50 nodes' }
    ],
    personas: [
      { name: 'Sarah', age: 34, occupation: 'SRE Lead', goals: 'Avoid budget blowouts' }
    ],
    competitors: [
      { name: 'Kubecost', marketShare: '20%', strengths: 'Popular open-source', weaknesses: 'No auto-remediation' }
    ]
  };

  test('PitchDeckPrintView renders all 7 slides with print-only class', () => {
    const { container } = render(<PitchDeckPrintView data={mockPlan} />);
    
    // Outer container has print-only class
    const printContainer = container.querySelector('#pitch-deck-printable');
    expect(printContainer).toBeInTheDocument();
    expect(printContainer).toHaveClass('print-only');

    // Exactly 7 slides rendered
    const slides = container.querySelectorAll('.print-pitch-slide');
    expect(slides).toHaveLength(7);

    // Verifies content from data is present
    const brandOccurrences = screen.getAllByText(/CloudPulse/i);
    expect(brandOccurrences.length).toBeGreaterThan(0);
    const uspOccurrences = screen.getAllByText(/Guaranteed 35% bill reduction/i);
    expect(uspOccurrences.length).toBeGreaterThan(0);
  });

  test('PitchDeckPrintView renders gracefully with empty data', () => {
    const { container } = render(<PitchDeckPrintView data={null} />);
    const slides = container.querySelectorAll('.print-pitch-slide');
    expect(slides).toHaveLength(7);
  });

  test('BusinessPlanPrintView renders all major sections with print-only class', () => {
    const { container } = render(<BusinessPlanPrintView data={mockPlan} />);

    const printContainer = container.querySelector('#business-plan-printable');
    expect(printContainer).toBeInTheDocument();
    expect(printContainer).toHaveClass('print-only');

    // Sections check
    expect(screen.getByText(/1\. Executive Summary & Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Target Market & User Personas/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Lean Canvas Strategic Framework/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. MVP Product Roadmap & Technical Scope/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Monetization & Pricing Model/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Competitive Landscape & Defensibility/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. Strategic Execution Roadmap/i)).toBeInTheDocument();
  });

  test('ExportTab renders Business Plan PDF export button and triggers print', () => {
    const spyTrigger = jest.spyOn(exportHelpers, 'triggerPrintWithTitle').mockImplementation(() => {});
    const mockNavigate = jest.fn();

    render(<ExportTab data={mockPlan} navigate={mockNavigate} isDark={false} />);

    // Business Plan export button
    const exportPdfButtons = screen.getAllByRole('button', { name: /Export PDF/i });
    expect(exportPdfButtons.length).toBeGreaterThan(0);
    fireEvent.click(exportPdfButtons[0]);

    expect(spyTrigger).toHaveBeenCalledWith('CloudPulse-Business-Plan', 'portrait');

    // Pitch deck navigation button
    const pitchDeckButton = screen.getByRole('button', { name: /Open Pitch Deck & Export/i });
    fireEvent.click(pitchDeckButton);
    expect(mockNavigate).toHaveBeenCalledWith('/pitch-preview');

    spyTrigger.mockRestore();
  });

  test('ExportTab displays Coming Soon on unsupported export options without claiming they work', () => {
    render(<ExportTab data={mockPlan} navigate={jest.fn()} isDark={false} />);

    const comingSoonBadges = screen.getAllByText(/Coming Soon/i);
    expect(comingSoonBadges.length).toBe(1); // Genuinely unsupported feature (Cap Table & Equity)

    const unavailableButtons = screen.getAllByRole('button', { name: /Unavailable/i });
    expect(unavailableButtons.length).toBe(1);
    unavailableButtons.forEach(btn => expect(btn).toBeDisabled());
  });

  test('ExportTab renders active Financial Model action and invokes financial exporter', async () => {
    const spyExport = jest.spyOn(financialExportHelpers, 'exportFinancialModelXlsx').mockResolvedValue({ success: true });
    render(<ExportTab data={mockPlan} navigate={jest.fn()} isDark={false} />);

    expect(screen.getByText(/Financial Model/i)).toBeInTheDocument();
    expect(screen.getByText(/Interactive Spreadsheet/i)).toBeInTheDocument();

    const exportBtn = screen.getByRole('button', { name: /Export Excel/i });
    expect(exportBtn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(exportBtn);
    });

    expect(spyExport).toHaveBeenCalledWith(mockPlan);
    spyExport.mockRestore();
  });

  test('ExportTab disables Financial Model export button when plan data is missing', () => {
    render(<ExportTab data={null} navigate={jest.fn()} isDark={false} />);

    const exportBtn = screen.getByRole('button', { name: /Export Excel/i });
    expect(exportBtn).toBeDisabled();
    expect(exportBtn).toHaveAttribute('title', 'No plan data available to export');
  });

  test('ExportTab displays user-facing error message when workbook export fails', async () => {
    const spyConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    const spyExport = jest.spyOn(financialExportHelpers, 'exportFinancialModelXlsx').mockRejectedValue(new Error('Memory allocation failure'));
    render(<ExportTab data={mockPlan} navigate={jest.fn()} isDark={false} />);

    const exportBtn = screen.getByRole('button', { name: /Export Excel/i });
    await act(async () => {
      fireEvent.click(exportBtn);
    });

    const errorAlert = await screen.findByText(/Memory allocation failure/i);
    expect(errorAlert).toBeInTheDocument();

    spyExport.mockRestore();
    spyConsole.mockRestore();
  });
});
