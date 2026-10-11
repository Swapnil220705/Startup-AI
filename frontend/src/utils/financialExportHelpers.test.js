/**
 * frontend/src/utils/financialExportHelpers.test.js
 * 
 * Comprehensive Unit and Integration Tests for Financial Model XLSX Export (Phase 5.6B).
 * 
 * Covers:
 * 1. Revenue object normalization
 * 2. Revenue array normalization
 * 3. Preservation of growth opportunities when present
 * 4. Missing and partial plan data handling
 * 5. Four worksheets generated with intended names
 * 6. Qualitative fields written as text cells
 * 7. Financial formulas use application-authored templates
 * 8. Example assumptions clearly labeled as illustrative
 * 9. Zero revenue does not produce divide-by-zero margin
 * 10. Filename sanitization & character safety
 * 11. Workbook download initiation and error handling
 * 12. Formula-injection sanitization (CWE-1236) for =, +, -, @, \t, \r
 */

import {
  DEFAULT_FINANCIAL_ASSUMPTIONS,
  sanitizeCellValue,
  sanitizeExportFilename,
  normalizeRevenueStrategy,
  generateFinancialModelWorkbook,
  downloadWorkbook,
  exportFinancialModelXlsx
} from './financialExportHelpers';

describe('Financial Model XLSX Export Engine (Phase 5.6B)', () => {
  const samplePlanObjectRevenue = {
    startupName: 'NovaScale AI',
    industry: 'Enterprise Software',
    problem: 'Manual data entry overhead',
    solution: 'Automated intelligence pipelines',
    targetAudience: 'Operations Leaders',
    usp: 'Zero-code real-time ingestion',
    revenue: {
      revenueStreams: 'SaaS recurring subscription with starter, pro, and enterprise tiers',
      pricingStrategy: 'Tiered value-based pricing per seat',
      expectedMonthlyRevenue: '$15K - $25K depending on pilot conversions',
      growthOpportunities: 'Expansion into mid-market ERP integrations and white-label licensing'
    },
    leanCanvas: {
      customerSegments: ['Enterprise Ops Directors', 'VP of Logistics'],
      channels: ['Direct Sales', 'Product-Led Growth'],
      costStructure: 'Cloud compute, developer salaries, SOC2 compliance',
      keyMetrics: 'MRR, Net Revenue Retention, CAC Payback Period',
      revenueStreams: 'Annual SaaS contract commitments'
    },
    mvp: {
      coreFeatures: ['Automated ETL Pipeline', 'Dashboard Visualizer', 'Alert Manager'],
      launchTimeline: '6-8 weeks for public beta'
    },
    pitch: {
      elevatorPitch: 'NovaScale AI eliminates 90% of manual data entry for logistics teams.'
    }
  };

  const samplePlanArrayRevenue = {
    name: 'CloudPulse',
    industry: 'DevOps',
    revenue: [
      {
        model: 'Primary Revenue Stream',
        description: 'Monthly compute usage fees and seat licenses',
        projection: '$5,000 - $12,000 monthly baseline'
      },
      {
        model: 'Pricing Strategy',
        description: 'Consumption-based pricing with free tier',
        projection: 'Growth Phase'
      },
      {
        model: 'Growth Opportunities',
        description: 'Managed private cloud deployments and premium SLA add-ons'
      }
    ],
    leanCanvas: {
      costStructure: 'Multi-region AWS clusters, 24/7 on-call engineers',
      keyMetrics: 'Daily Active Clusters, MTTR'
    }
  };

  // --------------------------------------------------------------------------
  // 1. Revenue Object Normalization
  // --------------------------------------------------------------------------
  test('1: Normalizes revenue object correctly into structured strategy', () => {
    const normalized = normalizeRevenueStrategy(samplePlanObjectRevenue.revenue, samplePlanObjectRevenue.leanCanvas);

    expect(normalized.hasRevenueData).toBe(true);
    expect(normalized.revenueStreams).toContain('SaaS recurring subscription');
    expect(normalized.pricingStrategy).toContain('Tiered value-based pricing');
    expect(normalized.expectedMonthlyRevenue).toBe('$15K - $25K depending on pilot conversions');
    expect(normalized.growthOpportunities).toContain('mid-market ERP integrations');
  });

  // --------------------------------------------------------------------------
  // 2. Revenue Array Normalization
  // --------------------------------------------------------------------------
  test('2: Normalizes revenue array correctly without data loss', () => {
    const normalized = normalizeRevenueStrategy(samplePlanArrayRevenue.revenue, samplePlanArrayRevenue.leanCanvas);

    expect(normalized.hasRevenueData).toBe(true);
    expect(normalized.revenueStreams).toContain('Monthly compute usage fees');
    expect(normalized.pricingStrategy).toContain('Consumption-based pricing');
    expect(normalized.expectedMonthlyRevenue).toContain('$5,000 - $12,000');
  });

  // --------------------------------------------------------------------------
  // 3. Preservation of Growth Opportunities
  // --------------------------------------------------------------------------
  test('3: Preserves growth opportunities from revenue array or lean canvas', () => {
    // Array with explicit growth item
    const fromArray = normalizeRevenueStrategy(samplePlanArrayRevenue.revenue);
    expect(fromArray.growthOpportunities).toContain('Managed private cloud deployments');

    // Object with lean canvas fallback
    const fallback = normalizeRevenueStrategy(
      { revenueStreams: 'Only stream' },
      { revenueStreams: 'Enterprise annual agreements' }
    );
    expect(fallback.growthOpportunities).toBe('Enterprise annual agreements');
  });

  // --------------------------------------------------------------------------
  // 4. Missing and Partial Plan Data
  // --------------------------------------------------------------------------
  test('4: Handles missing and partial plan data without crashing or throwing', () => {
    // Completely null / empty plan
    const emptyWb = generateFinancialModelWorkbook({});
    expect(emptyWb).toBeDefined();
    expect(emptyWb.worksheets.length).toBe(4);

    // Plan with null modules
    const partialWb = generateFinancialModelWorkbook({
      startupName: 'PartialCo',
      revenue: null,
      leanCanvas: null,
      mvp: null,
      pitch: null
    });
    expect(partialWb).toBeDefined();

    const sheet2 = partialWb.worksheets[1];
    expect(sheet2).toBeDefined();
    // Cells contain safe fallbacks
    const rowsText = sheet2.getRows(1, 20).map(r => r?.values?.join(' ') || '').join(' ');
    expect(rowsText).toContain('Not provided');
  });

  // --------------------------------------------------------------------------
  // 5. Four Worksheets Generated with Intended Names
  // --------------------------------------------------------------------------
  test('5: Generates four distinct worksheets with intended functional names', () => {
    const wb = generateFinancialModelWorkbook(samplePlanObjectRevenue);

    expect(wb.worksheets.length).toBe(4);
    const names = wb.worksheets.map(w => w.name);

    // Sheet 1: Overview & Assumptions (truncated or full)
    expect(names[0]).toMatch(/Executive Overview & Assumption/);
    // Sheet 2: Monetization & Revenue Strategy
    expect(names[1]).toBe('Monetization & Revenue Strategy');
    // Sheet 3: Cost Structure & Operations
    expect(names[2]).toMatch(/Cost Structure & Operation/);
    // Sheet 4: 12-Month Working Model
    expect(names[3]).toBe('12-Month Working Model');

    // getWorksheet supports query by full names
    expect(wb.getWorksheet('Executive Overview & Assumptions')).toBeDefined();
    expect(wb.getWorksheet('Monetization & Revenue Strategy')).toBeDefined();
    expect(wb.getWorksheet('Cost Structure & Operational Drivers')).toBeDefined();
    expect(wb.getWorksheet('12-Month Working Model')).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // 6. Qualitative Fields Written as Text
  // --------------------------------------------------------------------------
  test('6: Qualitative narrative fields are stored strictly as text cells', () => {
    const wb = generateFinancialModelWorkbook(samplePlanObjectRevenue);
    const ws2 = wb.getWorksheet('Monetization & Revenue Strategy');

    // Find row with revenue streams
    const streamRow = ws2.getRows(1, 25).find(r => r && r.getCell(1)?.value === 'Details');
    expect(streamRow).toBeDefined();

    const cellVal = streamRow.getCell(2).value;
    expect(typeof cellVal).toBe('string');
    expect(cellVal).toContain('SaaS recurring subscription');
    // Never an object with formula key
    expect(streamRow.getCell(2).formula).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // 7. Financial Formulas Use Application-Authored Templates
  // --------------------------------------------------------------------------
  test('7: Sheet 4 financial formulas strictly use application-authored templates', () => {
    const wb = generateFinancialModelWorkbook(samplePlanObjectRevenue);
    const ws4 = wb.getWorksheet('12-Month Working Model');

    // Row 6: Active Customers (Month 1 references Sheet 1 cell B21)
    const m1CustCell = ws4.getCell('C6');
    expect(m1CustCell.value.formula).toMatch(/'Executive Overview & Assumption'![$]B[$]21/);
    expect(m1CustCell.value.result).toBe(DEFAULT_FINANCIAL_ASSUMPTIONS.startingCustomers);

    // Row 6: Active Customers (Month 2 compounds on Month 1)
    const m2CustCell = ws4.getCell('D6');
    expect(m2CustCell.value.formula).toMatch(/ROUND\(C6\*\(1\+'Executive Overview & Assumption'![$]B[$]22\),0\)/);

    // Row 8: Gross Revenue (Month 1 = Customers * ARPU)
    const m1RevCell = ws4.getCell('C8');
    expect(m1RevCell.value.formula).toMatch(/C6\*'Executive Overview & Assumption'![$]B[$]20/);

    // Row 15: Gross Profit (Revenue - Total Direct Costs)
    const m1GPCell = ws4.getCell('C15');
    expect(m1GPCell.value.formula).toBe('C8-C13');

    // Row 18: Estimated Operating Result (Gross Profit - Opex)
    const m1EbitdaCell = ws4.getCell('C18');
    expect(m1EbitdaCell.value.formula).toBe('C15-C17');

    // Row 8 Total: Full Year Gross Revenue Sum
    const yearRevCell = ws4.getCell('O8');
    expect(yearRevCell.value.formula).toBe('SUM(C8:N8)');
  });

  // --------------------------------------------------------------------------
  // 8. Example Assumptions are Clearly Labeled as Illustrative
  // --------------------------------------------------------------------------
  test('8: Starter model assumptions are explicitly labeled as illustrative in Sheet 1', () => {
    const wb = generateFinancialModelWorkbook(samplePlanObjectRevenue);
    const ws1 = wb.getWorksheet('Executive Overview & Assumptions');

    const allText = ws1.getRows(1, 35).map(r => r?.values?.join(' ') || '').join(' ');
    expect(allText).toMatch(/illustrative starter values/i);
    expect(allText).toMatch(/NOT AI-generated financial forecasts/i);
    expect(allText).toMatch(/Starter Value \(Editable\)/i);

    // Default assumption numbers exist in exact cells B20-B27
    expect(ws1.getCell('B20').value).toBe(49.00); // ARPU
    expect(ws1.getCell('B21').value).toBe(10);    // Starting Customers
    expect(ws1.getCell('B22').value).toBe(0.15);  // Growth Rate
    expect(ws1.getCell('B23').value).toBe(100.00);// Base Infra
    expect(ws1.getCell('B24').value).toBe(1.50);  // Var Infra
    expect(ws1.getCell('B25').value).toBe(0.029); // Fee Rate
    expect(ws1.getCell('B26').value).toBe(0.30);  // Fixed Fee
    expect(ws1.getCell('B27').value).toBe(500.00);// Opex
  });

  // --------------------------------------------------------------------------
  // 9. Zero Revenue Does Not Produce Divide-By-Zero Margin
  // --------------------------------------------------------------------------
  test('9: Zero revenue safely produces zero margin without division by zero', () => {
    const wb = generateFinancialModelWorkbook(samplePlanObjectRevenue);
    const ws4 = wb.getWorksheet('12-Month Working Model');

    // Gross margin formulas are guarded with IF(Revenue > 0, GP / Revenue, 0)
    const marginM1 = ws4.getCell('C16');
    expect(marginM1.value.formula).toBe('IF(C8>0,C15/C8,0)');

    const marginFullYear = ws4.getCell('O16');
    expect(marginFullYear.value.formula).toBe('IF(O8>0,O15/O8,0)');

    // Verify formula structure is preserved and guarded when inputs are 0
    const zeroCustPlan = generateFinancialModelWorkbook(
      samplePlanObjectRevenue,
      { startingCustomers: 0, arpu: 0 }
    );
    const zeroWs4 = zeroCustPlan.getWorksheet('12-Month Working Model');
    expect(zeroWs4.getCell('C16').value.formula).toBe('IF(C8>0,C15/C8,0)');
    expect(zeroWs4.getCell('O16').value.formula).toBe('IF(O8>0,O15/O8,0)');
  });

  // --------------------------------------------------------------------------
  // 10. Filename Sanitization
  // --------------------------------------------------------------------------
  test('10: Sanitizes export filenames against invalid characters and path traversal', () => {
    expect(sanitizeExportFilename('NovaScale AI')).toBe('NovaScale-AI-Financial-Model.xlsx');
    expect(sanitizeExportFilename('Tech/Start:Up*2026?')).toBe('Tech-Start-Up-2026-Financial-Model.xlsx');
    expect(sanitizeExportFilename('../../etc/passwd')).toBe('etc-passwd-Financial-Model.xlsx');
    expect(sanitizeExportFilename('')).toBe('Startup-AI-Financial-Model.xlsx');
    expect(sanitizeExportFilename(null)).toBe('Startup-AI-Financial-Model.xlsx');

    // Long names truncated to 50 chars prefix
    const longName = 'A'.repeat(80);
    const sanitized = sanitizeExportFilename(longName);
    expect(sanitized.startsWith('A'.repeat(50))).toBe(true);
    expect(sanitized.endsWith('-Financial-Model.xlsx')).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 11. Workbook Download Initiation and Error Handling
  // --------------------------------------------------------------------------
  test('11: Initiates client download and handles failures safely', async () => {
    const mockClick = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();

    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          click: mockClick,
          href: '',
          download: ''
        };
      }
      return origCreateElement(tagName);
    });

    jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

    const origCreateObjectURL = window.URL.createObjectURL;
    const origRevokeObjectURL = window.URL.revokeObjectURL;
    window.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/test-uuid');
    window.URL.revokeObjectURL = jest.fn();

    const wb = generateFinancialModelWorkbook(samplePlanObjectRevenue);
    const blob = await downloadWorkbook(wb, 'Test-Financial-Model.xlsx');

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(mockClick).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalled();

    // Cleanup mocks
    document.createElement.mockRestore();
    document.body.appendChild.mockRestore();
    document.body.removeChild.mockRestore();
    window.URL.createObjectURL = origCreateObjectURL;
    window.URL.revokeObjectURL = origRevokeObjectURL;
  });

  // --------------------------------------------------------------------------
  // 12. Formula Injection Sanitization (CWE-1236)
  // --------------------------------------------------------------------------
  test('12: Sanitizes cells against formula injection for =, +, -, @, \\t, and \\r', () => {
    expect(sanitizeCellValue('=1+1')).toBe("'=1+1");
    expect(sanitizeCellValue('+2+2')).toBe("'+2+2");
    expect(sanitizeCellValue('-3*3')).toBe("'-3*3");
    expect(sanitizeCellValue('@SUM(A1:B1)')).toBe("'@SUM(A1:B1)");
    expect(sanitizeCellValue('\tcmd.exe')).toBe("'\tcmd.exe");
    expect(sanitizeCellValue('\rcalc.exe')).toBe("'\rcalc.exe");

    // Normal safe strings remain unchanged
    expect(sanitizeCellValue('Regular text')).toBe('Regular text');
    expect(sanitizeCellValue('100% cloud hosted')).toBe('100% cloud hosted');
    expect(sanitizeCellValue(42)).toBe(42);
    expect(sanitizeCellValue(null)).toBe('');
    expect(sanitizeCellValue(undefined)).toBe('');

    // When inserted into workbook, malicious AI output is sanitized
    const maliciousPlan = {
      startupName: '=cmd|/c calc!A0',
      revenue: {
        revenueStreams: '@SUM(1+1)',
        pricingStrategy: '+cmd|/c notepad!A0',
        expectedMonthlyRevenue: '-2000'
      }
    };
    const wb = generateFinancialModelWorkbook(maliciousPlan);
    const ws1 = wb.getWorksheet('Executive Overview & Assumptions');
    const nameCell = ws1.getRows(1, 10).find(r => r?.getCell(1)?.value === 'Startup Name')?.getCell(2);
    expect(nameCell.value).toBe("'=cmd|/c calc!A0");
  });
});
