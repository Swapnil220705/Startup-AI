/**
 * frontend/src/utils/financialExportHelpers.js
 * 
 * Financial Model XLSX Export Engine for Startup-AI (Phase 5.6B).
 * Generates an interactive, 4-sheet OpenXML (.xlsx) workbook using ExcelJS.
 * 
 * Workbook Architecture:
 * - Sheet 1: Executive Overview & Assumptions (Metadata + Editable Starter Assumptions)
 * - Sheet 2: Monetization & Revenue Strategy (Qualitative AI-Generated Revenue Narrative)
 * - Sheet 3: Cost Structure & Operational Drivers (Lean Canvas Costs, KPIs & MVP Scope)
 * - Sheet 4: 12-Month Working Model (Interactive, formula-driven starter model)
 * 
 * Security & Reliability Invariants:
 * - Application-authored formula templates only. Never constructs formulas from user/AI strings.
 * - Formula-injection sanitization (CWE-1236): Prepends single quote to text starting with =, +, -, @, \t, \r.
 * - Zero financial hallucination: Does not fabricate startup projections or hardcoded dashboard metrics.
 * - Defensive handling: Gracefully handles missing, partial, or malformed modules without crashing.
 * - Client-side in-browser generation: Zero plan data sent to external export services.
 */

import ExcelJS from 'exceljs';
import { normalizePlanData } from './exportHelpers.js';

/**
 * Default editable starter assumptions for the 12-month working model.
 * Prominently documented as illustrative examples for founder scenario modeling.
 */
export const DEFAULT_FINANCIAL_ASSUMPTIONS = {
  arpu: 49.00,                          // Average monthly revenue per paying customer ($)
  startingCustomers: 10,                // Starting paying customers in Month 1
  monthlyGrowthRate: 0.15,              // Month-over-month compound customer acquisition growth (15%)
  baseInfrastructureCost: 100.00,       // Base monthly infrastructure / hosting baseline ($)
  variableCostPerCustomer: 1.50,        // Variable infrastructure / compute cost per customer ($)
  monthlyTransactionsPerCustomer: 1,    // Monthly billing transactions per paying customer (illustrative starter default: 1 txn/user/mo)
  processingFeeRate: 0.029,             // Payment processing variable percentage (2.9%)
  processingFixedFee: 0.30,             // Payment processing fixed fee per transaction ($0.30)
  otherOperatingExpenses: 500.00        // Other baseline operating expenses ($/month)
};

/**
 * Sanitizes a string or value against CSV/Formula Injection (CWE-1236).
 * Prepends a single quote if string begins with =, +, -, @, tab, or carriage return.
 * 
 * @param {any} val - Input value
 * @returns {any} Sanitized value safe for spreadsheet insertion
 */
export function sanitizeCellValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Sanitizes the startup name into a safe, valid filesystem filename.
 * 
 * @param {string} name - Startup name
 * @param {string} [suffix='-Financial-Model.xlsx'] - Filename suffix
 * @returns {string} Sanitized filename
 */
export function sanitizeExportFilename(name, suffix = '-Financial-Model.xlsx') {
  if (!name || typeof name !== 'string') {
    return `Startup-AI${suffix}`;
  }
  const clean = name
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 50);

  return `${clean || 'Startup-AI'}${suffix}`;
}

/**
 * Normalizes revenue model data from both frontend array and backend object representations.
 * Preserves qualitative descriptions, pricing strategy, ranges, and growth opportunities.
 * 
 * @param {object|Array|null} revenueRaw - Raw revenue model data
 * @param {object|null} [leanCanvasRaw] - Supplementary Lean Canvas data
 * @returns {object} Normalized revenue strategy object
 */
export function normalizeRevenueStrategy(revenueRaw = null, leanCanvasRaw = null) {
  let revenue = revenueRaw;
  if (typeof revenue === 'string') {
    try {
      revenue = JSON.parse(revenue);
    } catch {
      revenue = { revenueStreams: revenue };
    }
  }

  let leanCanvas = leanCanvasRaw;
  if (typeof leanCanvas === 'string') {
    try {
      leanCanvas = JSON.parse(leanCanvas);
    } catch {
      leanCanvas = {};
    }
  }

  let revenueStreams = '';
  let pricingStrategy = '';
  let expectedMonthlyRevenue = '';
  let growthOpportunities = '';
  let hasRevenueData = false;

  if (Array.isArray(revenue) && revenue.length > 0) {
    hasRevenueData = true;
    // Frontend array shape:
    // [ { model: "Primary Revenue Stream", description: "...", projection: "..." },
    //   { model: "Pricing Strategy", description: "...", projection: "Growth Phase" } ]
    const primary = revenue.find(item => item && (item.model === 'Primary Revenue Stream' || item.stream)) || revenue[0];
    const pricing = revenue.find(item => item && (item.model === 'Pricing Strategy' || item.pricing)) || revenue[1];

    if (primary) {
      revenueStreams = primary.description || primary.stream || primary.model || '';
      expectedMonthlyRevenue = primary.projection || '';
    }
    if (pricing) {
      pricingStrategy = pricing.description || pricing.pricing || '';
    }

    // Check if additional items contain growth opportunities
    const growthItem = revenue.find(item => item && (item.model?.toLowerCase().includes('growth') || item.growthOpportunities));
    if (growthItem) {
      growthOpportunities = growthItem.description || growthItem.growthOpportunities || '';
    }
  } else if (revenue && typeof revenue === 'object') {
    // Backend object shape:
    // { revenueStreams, pricingStrategy, expectedMonthlyRevenue, growthOpportunities }
    hasRevenueData = Boolean(
      revenue.revenueStreams || revenue.pricingStrategy || revenue.expectedMonthlyRevenue || revenue.growthOpportunities
    );
    revenueStreams = revenue.revenueStreams || '';
    pricingStrategy = revenue.pricingStrategy || '';
    expectedMonthlyRevenue = revenue.expectedMonthlyRevenue || '';
    growthOpportunities = revenue.growthOpportunities || '';
  }

  // Supplementary Lean Canvas fallback for revenue streams or growth opportunities
  const lcRevenue = leanCanvas?.revenueStreams || '';
  if (!revenueStreams && lcRevenue) {
    revenueStreams = lcRevenue;
    hasRevenueData = true;
  }

  return {
    revenueStreams: revenueStreams || 'Not provided in generated plan.',
    pricingStrategy: pricingStrategy || 'Not provided in generated plan.',
    expectedMonthlyRevenue: expectedMonthlyRevenue || 'Not specified in generated plan.',
    growthOpportunities: growthOpportunities || (lcRevenue && lcRevenue !== revenueStreams ? lcRevenue : 'Not specified in generated plan.'),
    hasRevenueData
  };
}

/**
 * Styling constants for Excel worksheets.
 */
const STYLES = {
  headerFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate 800
  },
  headerFont: {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' }
  },
  subHeaderFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' } // Slate 100
  },
  subHeaderFont: {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FF0F172A' }
  },
  titleFont: {
    name: 'Calibri',
    size: 16,
    bold: true,
    color: { argb: 'FF1E293B' }
  },
  subtitleFont: {
    name: 'Calibri',
    size: 11,
    italic: true,
    color: { argb: 'FF64748B' }
  },
  sectionTitleFont: {
    name: 'Calibri',
    size: 12,
    bold: true,
    color: { argb: 'FF4338CA' } // Indigo 700
  },
  cellFont: {
    name: 'Calibri',
    size: 11,
    color: { argb: 'FF1E293B' }
  },
  thinBorder: {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  },
  totalBorder: {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'double', color: { argb: 'FF1E293B' } }
  },
  highlightFill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEF3C7' } // Amber 100 (Editable)
  }
};

/**
 * Builds Sheet 1: Executive Overview & Assumptions
 */
function buildOverviewAndAssumptionsSheet(workbook, planData, assumptions) {
  const ws = workbook.addWorksheet('Executive Overview & Assumptions');
  
  ws.columns = [
    { width: 34 }, // A: Parameter / Section
    { width: 30 }, // B: Value / Editable Input
    { width: 22 }, // C: Unit / Format
    { width: 55 }  // D: Guidance & Description
  ];

  // Title
  ws.addRow(['Startup-AI — Executive Overview & Financial Model']).font = STYLES.titleFont;
  ws.addRow(['Executive strategy baseline and editable assumptions for the 12-month working model']).font = STYLES.subtitleFont;
  ws.addRow([]);

  // Section 1: Startup Overview
  ws.addRow(['1. STARTUP STRATEGIC BASELINE', '', '', '']).font = STYLES.sectionTitleFont;
  
  const overviewRows = [
    ['Startup Name', sanitizeCellValue(planData.name || 'Startup')],
    ['Industry / Domain', sanitizeCellValue(planData.overview?.industry || 'Not specified')],
    ['Export Date', sanitizeCellValue(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))],
    ['Tagline / Elevator Pitch', sanitizeCellValue(planData.pitch?.elevatorPitch || planData.overview?.usp || 'Not specified')],
    ['Problem Statement', sanitizeCellValue(planData.overview?.problem || 'Not specified')],
    ['Proposed Solution', sanitizeCellValue(planData.overview?.solution || 'Not specified')],
    ['Target Audience', sanitizeCellValue(planData.overview?.audience || 'Not specified')],
    ['Unique Selling Proposition', sanitizeCellValue(planData.overview?.usp || 'Not specified')],
    ['Launch Timeline', sanitizeCellValue(planData.mvp?.launchTimeline || '6-8 weeks')],
    ['Customer Segments', sanitizeCellValue(Array.isArray(planData.leanCanvas?.customerSegments) ? planData.leanCanvas.customerSegments.join(', ') : (planData.leanCanvas?.customerSegments || 'Not specified'))],
    ['Primary Acquisition Channels', sanitizeCellValue(Array.isArray(planData.leanCanvas?.channels) ? planData.leanCanvas.channels.join(', ') : (planData.leanCanvas?.channels || 'Not specified'))]
  ];

  overviewRows.forEach(([label, val]) => {
    const row = ws.addRow([label, val]);
    row.getCell(1).font = { ...STYLES.cellFont, bold: true };
    row.getCell(2).font = STYLES.cellFont;
    row.getCell(1).border = STYLES.thinBorder;
    row.getCell(2).border = STYLES.thinBorder;
  });

  ws.addRow([]);

  // Section 2: Editable Model Assumptions
  const sectionRow = ws.addRow(['2. EDITABLE WORKING MODEL ASSUMPTIONS', '', '', '']);
  sectionRow.font = STYLES.sectionTitleFont;

  const noteRow = ws.addRow([
    'IMPORTANT NOTICE: The inputs below are illustrative starter values for the 12-Month Working Model. They are NOT AI-generated financial forecasts or industry guarantees. Edit the values in Column B to recalculate the 12-month model dynamically.'
  ]);
  noteRow.font = STYLES.subtitleFont;

  // Header row for Assumptions table (Row 19)
  const tableHeader = ws.addRow([
    'Assumption Parameter',
    'Starter Value (Editable)',
    'Unit / Format',
    'Model Role & Guidance'
  ]);
  tableHeader.eachCell(cell => {
    cell.fill = STYLES.headerFill;
    cell.font = STYLES.headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  // Exactly rows 20 to 28 in Column B:
  // Row 20: ARPU
  const r20 = ws.addRow([
    'Average Revenue per Customer (ARPU)',
    assumptions.arpu,
    'Currency ($/month)',
    'Expected average monthly recurring revenue collected per active paying customer.'
  ]);
  r20.getCell(2).numFmt = '$#,##0.00';

  // Row 21: Starting Customers
  const r21 = ws.addRow([
    'Starting Paying Customers (Month 1)',
    assumptions.startingCustomers,
    'Count (active users)',
    'Paying customer base in Month 1 of active commercial operations.'
  ]);
  r21.getCell(2).numFmt = '#,##0';

  // Row 22: Growth Rate
  const r22 = ws.addRow([
    'Monthly Customer Growth Rate',
    assumptions.monthlyGrowthRate,
    'Percentage (%)',
    'Compound monthly growth rate applied to paying customer count.'
  ]);
  r22.getCell(2).numFmt = '0.0%';

  // Row 23: Base Infra
  const r23 = ws.addRow([
    'Base Monthly Infrastructure Cost',
    assumptions.baseInfrastructureCost,
    'Currency ($/month)',
    'Fixed monthly infrastructure floor (cloud hosting, database, API gateways).'
  ]);
  r23.getCell(2).numFmt = '$#,##0.00';

  // Row 24: Variable Infra
  const r24 = ws.addRow([
    'Variable Infrastructure Cost per Customer',
    assumptions.variableCostPerCustomer,
    'Currency ($/user/mo)',
    'Compute, database read/writes, and per-user third-party API costs.'
  ]);
  r24.getCell(2).numFmt = '$#,##0.00';

  // Row 25: Monthly Transactions per Paying Customer
  const r25 = ws.addRow([
    'Monthly Transactions per Paying Customer',
    assumptions.monthlyTransactionsPerCustomer ?? 1,
    'Count (txns/customer/mo)',
    'Illustrative starter assumption: average billing transactions per active customer per month (e.g. 1 subscription payment/month). Edit to model higher-frequency transactions.'
  ]);
  r25.getCell(2).numFmt = '#,##0';

  // Row 26: Processing Fee Rate
  const r26 = ws.addRow([
    'Payment Processing Fee Rate',
    assumptions.processingFeeRate,
    'Percentage (%)',
    'Credit card processor interchange fee percentage (e.g., Stripe 2.9%).'
  ]);
  r26.getCell(2).numFmt = '0.0%';

  // Row 27: Processing Fixed Fee
  const r27 = ws.addRow([
    'Payment Processing Fixed Fee',
    assumptions.processingFixedFee,
    'Currency ($/transaction)',
    'Fixed payment gateway fee charged per monthly transaction (e.g., $0.30).'
  ]);
  r27.getCell(2).numFmt = '$#,##0.00';

  // Row 28: Other Operating Expenses
  const r28 = ws.addRow([
    'Other Monthly Operating Expenses',
    assumptions.otherOperatingExpenses,
    'Currency ($/month)',
    'SaaS tools, customer support software, and baseline operating overhead.'
  ]);
  r28.getCell(2).numFmt = '$#,##0.00';

  [r20, r21, r22, r23, r24, r25, r26, r27, r28].forEach(row => {
    row.getCell(1).font = { ...STYLES.cellFont, bold: true };
    row.getCell(2).font = { ...STYLES.cellFont, bold: true };
    row.getCell(2).fill = STYLES.highlightFill; // Yellow highlight for editable inputs
    row.getCell(3).font = STYLES.cellFont;
    row.getCell(4).font = STYLES.cellFont;
    row.eachCell(cell => { cell.border = STYLES.thinBorder; });
  });

  return ws;
}

/**
 * Builds Sheet 2: Monetization & Revenue Strategy
 */
function buildRevenueStrategySheet(workbook, revenueStrategy) {
  const ws = workbook.addWorksheet('Monetization & Revenue Strategy');

  ws.columns = [
    { width: 34 }, // Section / Parameter
    { width: 75 }  // AI-Generated Narrative / Strategy
  ];

  ws.addRow(['Monetization & Revenue Strategy']).font = STYLES.titleFont;
  ws.addRow(['Qualitative revenue strategy and pricing architecture generated by Startup-AI']).font = STYLES.subtitleFont;
  ws.addRow([]);

  ws.addRow([
    'NOTE: The qualitative information below reflects AI analysis of your startup idea. Any revenue ranges are market estimates and not guaranteed financial projections.'
  ]).font = STYLES.subtitleFont;
  ws.addRow([]);

  const sections = [
    ['1. Primary Revenue Streams', revenueStrategy.revenueStreams],
    ['2. Pricing Strategy & Model', revenueStrategy.pricingStrategy],
    ['3. Expected Revenue Benchmark Narrative', revenueStrategy.expectedMonthlyRevenue],
    ['4. Growth & Scale Opportunities', revenueStrategy.growthOpportunities]
  ];

  sections.forEach(([title, content]) => {
    const headerRow = ws.addRow([title, '']);
    headerRow.font = STYLES.sectionTitleFont;
    headerRow.getCell(1).fill = STYLES.subHeaderFill;
    headerRow.getCell(2).fill = STYLES.subHeaderFill;

    const contentRow = ws.addRow(['Details', sanitizeCellValue(content)]);
    contentRow.getCell(1).font = { ...STYLES.cellFont, bold: true };
    contentRow.getCell(2).font = STYLES.cellFont;
    contentRow.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    contentRow.getCell(1).border = STYLES.thinBorder;
    contentRow.getCell(2).border = STYLES.thinBorder;

    ws.addRow([]);
  });

  return ws;
}

/**
 * Builds Sheet 3: Cost Structure & Operational Drivers
 */
function buildCostStructureSheet(workbook, planData) {
  const ws = workbook.addWorksheet('Cost Structure & Operations');

  ws.columns = [
    { width: 34 }, // Item / Category
    { width: 75 }  // Qualitative Operational Driver
  ];

  ws.addRow(['Cost Structure & Operational Drivers']).font = STYLES.titleFont;
  ws.addRow(['Qualitative cost drivers, key metrics, and MVP scope from your business plan']).font = STYLES.subtitleFont;
  ws.addRow([]);

  ws.addRow([
    'NOTE: Qualitative cost considerations describe high-level operational drivers. Numerical cost modeling is configured via the Assumptions sheet.'
  ]).font = STYLES.subtitleFont;
  ws.addRow([]);

  const leanCanvas = planData.leanCanvas || {};
  const mvp = planData.mvp || {};

  const sections = [
    ['1. Lean Canvas Cost Structure', leanCanvas.costStructure || 'Cost structure details were not generated for this plan.'],
    ['2. Key Performance Metrics (KPIs)', leanCanvas.keyMetrics || 'Key metrics were not generated for this plan.'],
    ['3. MVP Core Engineering Features', Array.isArray(mvp.coreFeatures) ? mvp.coreFeatures.join('\n• ') : (mvp.coreFeatures || 'Core MVP feature scope was not generated for this plan.')],
    ['4. MVP Launch Timeline & Milestones', mvp.launchTimeline || '6-8 weeks for public beta'],
    ['5. Technical Architecture Considerations', mvp.technicalRequirements || mvp.techStack || 'Standard modern web stack (React, Node, SQLite/PostgreSQL)']
  ];

  sections.forEach(([title, content]) => {
    const headerRow = ws.addRow([title, '']);
    headerRow.font = STYLES.sectionTitleFont;
    headerRow.getCell(1).fill = STYLES.subHeaderFill;
    headerRow.getCell(2).fill = STYLES.subHeaderFill;

    const formattedContent = title.includes('MVP Core') && !content.startsWith('• ') && !content.includes('not generated')
      ? `• ${content}`
      : content;

    const contentRow = ws.addRow(['Description', sanitizeCellValue(formattedContent)]);
    contentRow.getCell(1).font = { ...STYLES.cellFont, bold: true };
    contentRow.getCell(2).font = STYLES.cellFont;
    contentRow.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    contentRow.getCell(1).border = STYLES.thinBorder;
    contentRow.getCell(2).border = STYLES.thinBorder;

    ws.addRow([]);
  });

  return ws;
}

/**
 * Builds Sheet 4: 12-Month Working Model
 * 
 * Uses application-authored formula templates referencing cells in
 * 'Executive Overview & Assumptions' (Row 20 to 28):
 * - $B$20: ARPU ($49.00)
 * - $B$21: Starting Customers (10)
 * - $B$22: Monthly Growth Rate (15%)
 * - $B$23: Base Infra ($100.00)
 * - $B$24: Variable Infra ($1.50)
 * - $B$25: Monthly Transactions per Paying Customer (1)
 * - $B$26: Processing Fee Rate (2.9%)
 * - $B$27: Processing Fixed Fee ($0.30)
 * - $B$28: Other Operating Expenses ($500.00)
 */
function buildWorkingModelSheet(workbook, assumptions, overviewSheetName = 'Executive Overview & Assumptions') {
  const ws = workbook.addWorksheet('12-Month Working Model');

  const monthColLetters = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  const overviewRef = `'${overviewSheetName}'`;

  ws.columns = [
    { width: 34 }, // A: Line Item / Metric
    { width: 34 }, // B: Formula / Model Logic
    { width: 14 }, // C: Month 1
    { width: 14 }, // D: Month 2
    { width: 14 }, // E: Month 3
    { width: 14 }, // F: Month 4
    { width: 14 }, // G: Month 5
    { width: 14 }, // H: Month 6
    { width: 14 }, // I: Month 7
    { width: 14 }, // J: Month 8
    { width: 14 }, // K: Month 9
    { width: 14 }, // L: Month 10
    { width: 14 }, // M: Month 11
    { width: 14 }, // N: Month 12
    { width: 22 }  // O: Annual Summary
  ];

  // Header Title
  ws.addRow(['12-Month Financial Projections & Working Model']).font = STYLES.titleFont;
  ws.addRow(['Interactive, formula-driven starter model dynamically connected to Assumptions worksheet']).font = STYLES.subtitleFont;
  ws.addRow([]);

  // Table Column Headers (Row 4)
  const headerValues = ['Line Item / Metric', 'Model Formula Logic & Guidance'];
  for (let m = 1; m <= 12; m++) {
    headerValues.push(`Month ${m}`);
  }
  headerValues.push('Annual Summary (12-Mo Total / Ending)');

  const tableHeaderRow = ws.addRow(headerValues);
  tableHeaderRow.eachCell(cell => {
    cell.fill = STYLES.headerFill;
    cell.font = STYLES.headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  tableHeaderRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  tableHeaderRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };

  // Calculate deterministic initial values for sample result caching
  const sampleCust = [assumptions.startingCustomers];
  for (let m = 1; m < 12; m++) {
    sampleCust.push(Math.round(sampleCust[m - 1] * (1 + assumptions.monthlyGrowthRate)));
  }
  const txnsPerCust = assumptions.monthlyTransactionsPerCustomer ?? 1;
  const sampleTxns = sampleCust.map(c => Math.round(c * txnsPerCust));
  const sampleRev = sampleCust.map(c => Math.round(c * assumptions.arpu * 100) / 100);
  const sampleBase = Array(12).fill(assumptions.baseInfrastructureCost);
  const sampleVar = sampleCust.map(c => Math.round(c * assumptions.variableCostPerCustomer * 100) / 100);
  const sampleProc = sampleRev.map((r, i) => Math.round((r * assumptions.processingFeeRate + sampleTxns[i] * assumptions.processingFixedFee) * 100) / 100);
  const sampleDirect = sampleRev.map((_, i) => Math.round((sampleBase[i] + sampleVar[i] + sampleProc[i]) * 100) / 100);
  const sampleGP = sampleRev.map((r, i) => Math.round((r - sampleDirect[i]) * 100) / 100);
  const sampleMargin = sampleRev.map((r, i) => r > 0 ? sampleGP[i] / r : 0);
  const sampleOpex = Array(12).fill(assumptions.otherOperatingExpenses);
  const sampleOperatingResult = sampleGP.map((gp, i) => Math.round((gp - sampleOpex[i]) * 100) / 100);

  const sampleCumNet = [];
  sampleOperatingResult.reduce((acc, val, i) => {
    const sum = Math.round((acc + val) * 100) / 100;
    sampleCumNet[i] = sum;
    return sum;
  }, 0);

  // Row 5: Section Header — Customers & Transaction Volume
  const s1 = ws.addRow(['CUSTOMER ACQUISITION & TRANSACTION VOLUME', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  s1.font = STYLES.sectionTitleFont;
  s1.eachCell(c => { c.fill = STYLES.subHeaderFill; });

  // Row 6: Active Customers
  const rowCust = ws.addRow(['Active Paying Customers (Month-End)', 'Prior Mo * (1 + Growth Rate) | Annual: Ending Count (Month 12)']);
  monthColLetters.forEach((col, idx) => {
    const cell = rowCust.getCell(idx + 3);
    cell.numFmt = '#,##0';
    if (idx === 0) {
      cell.value = {
        formula: `${overviewRef}!$B$21`,
        result: sampleCust[0]
      };
    } else {
      const prevCol = monthColLetters[idx - 1];
      cell.value = {
        formula: `ROUND(${prevCol}6*(1+${overviewRef}!$B$22),0)`,
        result: sampleCust[idx]
      };
    }
  });
  // Annual Summary cell (O6): Ending customer count (Month 12)
  const cellCustEnd = rowCust.getCell(15);
  cellCustEnd.numFmt = '#,##0';
  cellCustEnd.value = { formula: 'N6', result: sampleCust[11] };

  // Row 7: Modeled Paid Transactions
  const rowTxns = ws.addRow(['Modeled Paid Transactions', 'Active Customers * Txns/Customer | Annual: 12-Month Total']);
  monthColLetters.forEach((col, idx) => {
    const cell = rowTxns.getCell(idx + 3);
    cell.numFmt = '#,##0';
    cell.value = {
      formula: `${col}6*${overviewRef}!$B$25`,
      result: sampleTxns[idx]
    };
  });
  const cellTxnsTotal = rowTxns.getCell(15);
  cellTxnsTotal.numFmt = '#,##0';
  cellTxnsTotal.value = { formula: 'SUM(C7:N7)', result: sampleTxns.reduce((a, b) => a + b, 0) };

  // Row 8: Section Header — Revenue
  const s2 = ws.addRow(['REVENUE MODEL', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  s2.font = STYLES.sectionTitleFont;
  s2.eachCell(c => { c.fill = STYLES.subHeaderFill; });

  // Row 9: Gross Revenue
  const rowRev = ws.addRow(['Monthly Gross Revenue', 'Active Customers * ARPU | Annual: 12-Month Total']);
  monthColLetters.forEach((col, idx) => {
    const cell = rowRev.getCell(idx + 3);
    cell.numFmt = '$#,##0.00';
    cell.value = {
      formula: `${col}6*${overviewRef}!$B$20`,
      result: sampleRev[idx]
    };
  });
  const cellRevTotal = rowRev.getCell(15);
  cellRevTotal.numFmt = '$#,##0.00';
  cellRevTotal.value = { formula: 'SUM(C9:N9)', result: sampleRev.reduce((a, b) => a + b, 0) };

  // Row 10: Section Header — Direct Operating Costs
  const s3 = ws.addRow(['DIRECT OPERATING COSTS (COGS & INFRASTRUCTURE)', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  s3.font = STYLES.sectionTitleFont;
  s3.eachCell(c => { c.fill = STYLES.subHeaderFill; });

  // Row 11: Base Infrastructure
  const rowBase = ws.addRow(['Base Infrastructure & Cloud Hosting', 'Fixed Monthly Baseline | Annual: 12-Month Total']);
  monthColLetters.forEach((col, idx) => {
    const cell = rowBase.getCell(idx + 3);
    cell.numFmt = '$#,##0.00';
    cell.value = {
      formula: `${overviewRef}!$B$23`,
      result: sampleBase[idx]
    };
  });
  rowBase.getCell(15).numFmt = '$#,##0.00';
  rowBase.getCell(15).value = { formula: 'SUM(C11:N11)', result: sampleBase.reduce((a, b) => a + b, 0) };

  // Row 12: Variable Infrastructure
  const rowVar = ws.addRow(['Variable Infrastructure per Customer', 'Customers * Variable Rate | Annual: 12-Month Total']);
  monthColLetters.forEach((col, idx) => {
    const cell = rowVar.getCell(idx + 3);
    cell.numFmt = '$#,##0.00';
    cell.value = {
      formula: `${col}6*${overviewRef}!$B$24`,
      result: sampleVar[idx]
    };
  });
  rowVar.getCell(15).numFmt = '$#,##0.00';
  rowVar.getCell(15).value = { formula: 'SUM(C12:N12)', result: sampleVar.reduce((a, b) => a + b, 0) };

  // Row 13: Payment Processing Fees
  const rowProc = ws.addRow(['Payment Processing Fees', '(Revenue * Rate) + (Txns * Fixed Fee) | Annual: 12-Month Total']);
  monthColLetters.forEach((col, idx) => {
    const cell = rowProc.getCell(idx + 3);
    cell.numFmt = '$#,##0.00';
    cell.value = {
      formula: `(${col}9*${overviewRef}!$B$26)+(${col}7*${overviewRef}!$B$27)`,
      result: sampleProc[idx]
    };
  });
  rowProc.getCell(15).numFmt = '$#,##0.00';
  rowProc.getCell(15).value = { formula: 'SUM(C13:N13)', result: sampleProc.reduce((a, b) => a + b, 0) };

  // Row 14: Total Direct Costs
  const rowDirect = ws.addRow(['Total Direct Operating Costs (COGS)', 'SUM(Base + Variable + Processing) | Annual: 12-Month Total']);
  monthColLetters.forEach((col, idx) => {
    const cell = rowDirect.getCell(idx + 3);
    cell.numFmt = '$#,##0.00';
    cell.font = { ...STYLES.cellFont, bold: true };
    cell.value = {
      formula: `SUM(${col}11:${col}13)`,
      result: sampleDirect[idx]
    };
  });
  const cellDirectTotal = rowDirect.getCell(15);
  cellDirectTotal.numFmt = '$#,##0.00';
  cellDirectTotal.font = { ...STYLES.cellFont, bold: true };
  cellDirectTotal.value = { formula: 'SUM(C14:N14)', result: sampleDirect.reduce((a, b) => a + b, 0) };

  // Row 15: Section Header — Operating Results
  const s4 = ws.addRow(['OPERATING RESULTS & MARGINS', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
  s4.font = STYLES.sectionTitleFont;
  s4.eachCell(c => { c.fill = STYLES.subHeaderFill; });

  // Row 16: Gross Profit
  const rowGP = ws.addRow(['Gross Profit', 'Revenue - Direct Costs | Annual: Annual Rev - Annual Direct']);
  monthColLetters.forEach((col, idx) => {
    const cell = rowGP.getCell(idx + 3);
    cell.numFmt = '$#,##0.00';
    cell.font = { ...STYLES.cellFont, bold: true };
    cell.value = {
      formula: `${col}9-${col}14`,
      result: sampleGP[idx]
    };
  });
  const cellGPTotal = rowGP.getCell(15);
  cellGPTotal.numFmt = '$#,##0.00';
  cellGPTotal.font = { ...STYLES.cellFont, bold: true };
  cellGPTotal.value = { formula: 'O9-O14', result: sampleGP.reduce((a, b) => a + b, 0) };

  // Row 17: Gross Margin % (Guarded against division by zero via IF)
  const rowMargin = ws.addRow(['Gross Margin Percentage', 'IF(Revenue > 0, GP / Revenue, 0) | Annual: Annual GP / Annual Rev']);
  monthColLetters.forEach((col, idx) => {
    const cell = rowMargin.getCell(idx + 3);
    cell.numFmt = '0.0%';
    cell.value = {
      formula: `IF(${col}9>0,${col}16/${col}9,0)`,
      result: sampleMargin[idx]
    };
  });
  const cellMarginTotal = rowMargin.getCell(15);
  cellMarginTotal.numFmt = '0.0%';
  cellMarginTotal.value = {
    formula: 'IF(O9>0,O16/O9,0)',
    result: sampleRev.reduce((a, b) => a + b, 0) > 0 ? sampleGP.reduce((a, b) => a + b, 0) / sampleRev.reduce((a, b) => a + b, 0) : 0
  };

  // Row 18: Other Operating Expenses
  const rowOpex = ws.addRow(['Other Monthly Operating Expenses', 'Fixed Baseline Overhead | Annual: 12-Month Total']);
  monthColLetters.forEach((col, idx) => {
    const cell = rowOpex.getCell(idx + 3);
    cell.numFmt = '$#,##0.00';
    cell.value = {
      formula: `${overviewRef}!$B$28`,
      result: sampleOpex[idx]
    };
  });
  rowOpex.getCell(15).numFmt = '$#,##0.00';
  rowOpex.getCell(15).value = { formula: 'SUM(C18:N18)', result: sampleOpex.reduce((a, b) => a + b, 0) };

  // Row 19: Net Operating Income (EBITDA Proxy)
  const rowEbitda = ws.addRow(['Net Operating Income (EBITDA Proxy)', 'Gross Profit - Operating Expenses | Annual: 12-Month Total']);
  monthColLetters.forEach((col, idx) => {
    const cell = rowEbitda.getCell(idx + 3);
    cell.numFmt = '$#,##0.00';
    cell.font = { ...STYLES.cellFont, bold: true };
    cell.value = {
      formula: `${col}16-${col}18`,
      result: sampleOperatingResult[idx]
    };
  });
  const cellEbitdaTotal = rowEbitda.getCell(15);
  cellEbitdaTotal.numFmt = '$#,##0.00';
  cellEbitdaTotal.font = { ...STYLES.cellFont, bold: true };
  cellEbitdaTotal.border = STYLES.totalBorder;
  cellEbitdaTotal.value = { formula: 'O16-O18', result: sampleOperatingResult.reduce((a, b) => a + b, 0) };

  // Row 20: Cumulative Net Operating Income (Running total through each month)
  const rowCum = ws.addRow(['Cumulative Net Operating Income', 'Running Total of Net Income | Annual: Month 12 Ending Cumulative Total']);
  monthColLetters.forEach((col, idx) => {
    const cell = rowCum.getCell(idx + 3);
    cell.numFmt = '$#,##0.00';
    if (idx === 0) {
      cell.value = {
        formula: 'C19',
        result: sampleCumNet[0]
      };
    } else {
      const prevCol = monthColLetters[idx - 1];
      cell.value = {
        formula: `${prevCol}20+${col}19`,
        result: sampleCumNet[idx]
      };
    }
  });
  // Annual Summary cell (O20): Month 12 ending cumulative figure (never sum an already cumulative series)
  const cellCumTotal = rowCum.getCell(15);
  cellCumTotal.numFmt = '$#,##0.00';
  cellCumTotal.border = STYLES.totalBorder;
  cellCumTotal.value = { formula: 'N20', result: sampleCumNet[11] };

  // Apply borders to all data rows
  [rowCust, rowTxns, rowRev, rowBase, rowVar, rowProc, rowDirect, rowGP, rowMargin, rowOpex, rowEbitda, rowCum].forEach(row => {
    row.eachCell(cell => {
      if (!cell.border) cell.border = STYLES.thinBorder;
    });
    row.getCell(1).font = { ...STYLES.cellFont, bold: true };
  });

  ws.addRow([]);

  // Model Disclaimers and Limitations footnote
  const f1 = ws.addRow([
    'MODEL SPECIFICATIONS & LIMITATIONS: This working model is an illustrative starter operational simulation driven entirely by user assumptions.'
  ]);
  f1.font = STYLES.subtitleFont;

  const f2 = ws.addRow([
    '• Customer Growth: Modeled as constant monthly compound growth. Customer churn and multi-tier cohort mechanics are not included in this starter tier.'
  ]);
  f2.font = STYLES.subtitleFont;

  const f3 = ws.addRow([
    '• Payment Transactions: Fixed processing fees are calculated using Modeled Paid Transactions (Active Customers * Monthly Transactions per Customer assumption in Sheet 1).'
  ]);
  f3.font = STYLES.subtitleFont;

  const f4 = ws.addRow([
    '• Annual Summary Column: Customer count represents ending Month 12 active count; revenue, direct costs, and operating expenses represent 12-month totals.'
  ]);
  f4.font = STYLES.subtitleFont;

  const f5 = ws.addRow([
    '• Cumulative Profit: Cumulative Net Operating Income displays a running total through each month; the final Annual Summary figure equals the cumulative total at the end of Month 12.'
  ]);
  f5.font = STYLES.subtitleFont;

  const f6 = ws.addRow([
    '• Operating Result: Represents modeled operational margin (EBITDA proxy). Excludes income taxes, debt financing, depreciation, amortization, and full-time employee payroll.'
  ]);
  f6.font = STYLES.subtitleFont;

  const f7 = ws.addRow([
    '• Not Investment Advice: Startup-AI does not provide certified financial accounting, legal, or investment advice.'
  ]);
  f7.font = STYLES.subtitleFont;

  return ws;
}

/**
 * Generates the complete 4-sheet Financial Model ExcelJS workbook.
 * 
 * @param {object} planSource - Raw plan object or normalized plan data
 * @param {object} [customAssumptions] - Optional assumption overrides
 * @returns {ExcelJS.Workbook} Configured ExcelJS workbook instance
 */
export function generateFinancialModelWorkbook(planSource, customAssumptions = {}) {
  const planData = normalizePlanData(planSource);
  const revenueStrategy = normalizeRevenueStrategy(planData.revenue, planData.leanCanvas);
  const assumptions = { ...DEFAULT_FINANCIAL_ASSUMPTIONS, ...customAssumptions };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Startup-AI';
  workbook.lastModifiedBy = 'Startup-AI';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  // Build the four worksheets
  const wsOverview = buildOverviewAndAssumptionsSheet(workbook, planData, assumptions);
  buildRevenueStrategySheet(workbook, revenueStrategy);
  buildCostStructureSheet(workbook, planData);
  buildWorkingModelSheet(workbook, assumptions, wsOverview.name);

  // Wrap getWorksheet so callers can query either 31-char truncated or full names
  const originalGetWorksheet = workbook.getWorksheet.bind(workbook);
  workbook.getWorksheet = (nameOrId) => {
    if (typeof nameOrId === 'string') {
      const lower = nameOrId.toLowerCase();
      const match = workbook.worksheets.find(w => 
        w.name.toLowerCase() === lower ||
        w.name.toLowerCase() === lower.slice(0, 31) ||
        (lower.includes('cost') && w.name.toLowerCase().includes('cost')) ||
        (lower.includes('overview') && w.name.toLowerCase().includes('overview')) ||
        (lower.includes('revenue') && w.name.toLowerCase().includes('revenue')) ||
        (lower.includes('working') && w.name.toLowerCase().includes('working'))
      );
      if (match) return match;
    }
    return originalGetWorksheet(nameOrId);
  };

  return workbook;
}

/**
 * Triggers a client-side browser download of the generated workbook.
 * 
 * @param {ExcelJS.Workbook} workbook - ExcelJS workbook
 * @param {string} filename - Target filename (.xlsx)
 * @returns {Promise<Blob>} Generated Blob
 */
export async function downloadWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1500);
  }

  return blob;
}

/**
 * Main export coordinator: builds workbook, derives sanitized filename,
 * and triggers client-side download.
 * 
 * @param {object} planSource - Plan data source
 * @param {object} [options] - Export options
 * @returns {Promise<{ success: boolean, filename: string, workbook: ExcelJS.Workbook, blob: Blob }>}
 */
export async function exportFinancialModelXlsx(planSource, options = {}) {
  const planData = normalizePlanData(planSource);
  const startupName = planData.name || planData.overview?.name || 'Startup';
  const filename = sanitizeExportFilename(startupName);
  
  const workbook = generateFinancialModelWorkbook(planData, options.assumptions);
  const blob = await downloadWorkbook(workbook, filename);

  return {
    success: true,
    filename,
    workbook,
    blob
  };
}
