import {
  normalizePlanData,
  buildPitchDeckSlides,
  buildBusinessPlanDocument,
  triggerPrintWithTitle
} from './exportHelpers';

describe('exportHelpers', () => {
  const completeMockPlan = {
    overview: {
      name: 'OmniFlow AI',
      industry: 'Enterprise SaaS',
      problem: 'Data silos in mid-market logistics teams.',
      solution: 'Automated predictive routing pipeline.',
      audience: 'Logistics directors and fleet managers',
      usp: 'Zero-config ERP integration with real-time ETA'
    },
    leanCanvas: {
      startupName: 'OmniFlow AI',
      problem: 'Data silos in logistics',
      solution: 'Predictive routing',
      uniqueValueProposition: 'Real-time ETA accuracy',
      unfairAdvantage: 'Proprietary graph routing engine',
      customerSegments: ['Fleet operators', 'Supply chain VPs'],
      keyMetrics: ['Route variance %', 'Delivery SLA adherence'],
      channels: ['Direct enterprise sales', 'Industry conferences'],
      costStructure: ['Cloud GPU clusters', 'Integration engineering'],
      revenueStreams: ['$5,000/mo platform fee', '$0.02 per route calculation']
    },
    mvp: {
      coreFeatures: ['Auto-import CSV', 'Dynamic map view', 'Driver mobile alerts'],
      technicalRequirements: ['Node.js backend', 'PostgreSQL / PostGIS'],
      launchTimeline: '8 weeks'
    },
    revenue: [
      {
        stream: 'Enterprise Tier',
        pricing: '$4,999/month',
        model: 'Subscription SaaS',
        description: 'Unlimited routes with dedicated SLA support.'
      }
    ],
    pitch: {
      elevatorPitch: 'OmniFlow AI eliminates logistics delays with instant predictive dispatch.',
      usp: 'Zero-config ERP integration'
    },
    personas: [
      {
        name: 'Marcus Vance',
        age: 42,
        occupation: 'VP of Supply Chain',
        goals: 'Reduce late deliveries below 1%',
        painPoints: 'Fragmented telematics software'
      }
    ],
    competitors: [
      {
        name: 'LegacyLogistics',
        marketShare: '45%',
        strengths: 'Deep brand relationships',
        weaknesses: 'Outdated legacy UI and slow updates'
      }
    ]
  };

  describe('normalizePlanData', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    test('normalizes a complete state object without mutating original fields', () => {
      const normalized = normalizePlanData(completeMockPlan);
      expect(normalized.overview.name).toBe('OmniFlow AI');
      expect(normalized.overview.industry).toBe('Enterprise SaaS');
      expect(normalized.leanCanvas.problem).toBe('Data silos in logistics');
      expect(normalized.mvp.coreFeatures).toHaveLength(3);
      expect(normalized.revenue).toHaveLength(1);
      expect(normalized.pitch.elevatorPitch).toContain('OmniFlow AI');
      expect(normalized.personas).toHaveLength(1);
      expect(normalized.competitors).toHaveLength(1);
    });

    test('falls back to localStorage when no raw source provided', () => {
      localStorage.setItem('formData', JSON.stringify({
        name: 'Local Startup',
        domain: 'FinTech',
        problem: 'Invoicing delays',
        solution: 'Instant payments',
        audience: 'Freelancers',
        usp: 'Instant zero-fee payout'
      }));
      localStorage.setItem('pitch', JSON.stringify({
        elevatorPitch: 'Local Startup automates payments for freelancers.'
      }));

      const normalized = normalizePlanData();
      expect(normalized.overview.name).toBe('Local Startup');
      expect(normalized.overview.industry).toBe('FinTech');
      expect(normalized.pitch.elevatorPitch).toBe('Local Startup automates payments for freelancers.');
      expect(normalized.leanCanvas).toBeNull();
    });

    test('handles empty or null input safely without throwing', () => {
      const normalized = normalizePlanData(null);
      expect(normalized.overview.name).toBe('Your Startup');
      expect(normalized.overview.problem).toBe('');
      expect(normalized.leanCanvas).toBeNull();
      expect(normalized.mvp).toBeNull();
      expect(normalized.revenue).toBeNull();
    });

    test('parses API response format with snake_case and stringified JSON', () => {
      const apiPlan = {
        startupName: 'ApiCorp',
        industry: 'HealthTech',
        problem: 'Paper charts',
        solution: 'Cloud EMR',
        targetAudience: 'Clinics',
        usp: 'HIPAA cloud in minutes',
        lean_canvas: JSON.stringify({ problem: 'Paper waste' }),
        mvp: JSON.stringify({ coreFeatures: ['Digital chart'] })
      };

      const normalized = normalizePlanData(apiPlan);
      expect(normalized.overview.name).toBe('ApiCorp');
      expect(normalized.overview.industry).toBe('HealthTech');
      expect(normalized.leanCanvas.problem).toBe('Paper waste');
      expect(normalized.mvp.coreFeatures).toEqual(['Digital chart']);
    });
  });

  describe('buildPitchDeckSlides', () => {
    test('generates exactly 7 slides with correct structural types and fields', () => {
      const slides = buildPitchDeckSlides(completeMockPlan);
      expect(slides).toHaveLength(7);

      const [s1, s2, s3, s4, s5, s6, s7] = slides;

      // Slide 1: Title
      expect(s1.number).toBe(1);
      expect(s1.type).toBe('title');
      expect(s1.headline).toBe('OmniFlow AI');
      expect(s1.tagline).toBe('Zero-config ERP integration with real-time ETA');
      expect(s1.elevatorPitch).toContain('OmniFlow AI');

      // Slide 2: Problem & Solution
      expect(s2.number).toBe(2);
      expect(s2.type).toBe('problem-solution');
      expect(s2.problem).toBe('Data silos in mid-market logistics teams.');
      expect(s2.solution).toBe('Automated predictive routing pipeline.');

      // Slide 3: Market Opportunity
      expect(s3.number).toBe(3);
      expect(s3.type).toBe('market-opportunity');
      expect(s3.audience).toContain('Logistics directors');
      expect(s3.customerSegments).toEqual(['Fleet operators', 'Supply chain VPs']);

      // Slide 4: Product Overview
      expect(s4.number).toBe(4);
      expect(s4.type).toBe('product-overview');
      expect(s4.coreFeatures).toHaveLength(3);

      // Slide 5: Monetization
      expect(s5.number).toBe(5);
      expect(s5.type).toBe('monetization');
      expect(s5.revenueStreams).toHaveLength(1);
      expect(s5.revenueStreams[0].stream).toBe('Enterprise Tier');

      // Slide 6: Competition & Positioning
      expect(s6.number).toBe(6);
      expect(s6.type).toBe('competition');
      expect(s6.usp).toContain('Zero-config');
      expect(s6.competitors).toHaveLength(1);

      // Slide 7: Next Steps & Milestones
      expect(s7.number).toBe(7);
      expect(s7.type).toBe('next-steps');
      expect(s7.milestones).toHaveLength(3);
    });

    test('handles partial plan with missing modules defensively without throwing', () => {
      const partialPlan = {
        overview: {
          name: 'PartialBot',
          industry: 'AI',
          problem: 'Slow manual review',
          solution: 'Automated review'
        }
        // leanCanvas, mvp, revenue, pitch, personas, competitors missing
      };

      const slides = buildPitchDeckSlides(partialPlan);
      expect(slides).toHaveLength(7);
      expect(slides[0].headline).toBe('PartialBot');
      expect(slides[0].elevatorPitch).toBe('AI-generated elevator pitch not available for this plan.');
      expect(slides[3].coreFeatures).toEqual([]);
      expect(slides[4].revenueStreams).toEqual([]);
      expect(slides[5].competitors).toEqual([]);
    });
  });

  describe('buildBusinessPlanDocument', () => {
    test('produces comprehensive executive business plan document structure', () => {
      const doc = buildBusinessPlanDocument(completeMockPlan);

      expect(doc.metadata.startupName).toBe('OmniFlow AI');
      expect(doc.executiveSummary.startupName).toBe('OmniFlow AI');
      expect(doc.companyOverview.problem).toBe('Data silos in mid-market logistics teams.');
      expect(doc.marketAndPersonas.personas).toHaveLength(1);
      expect(doc.leanCanvas.uniqueValueProposition).toBe('Real-time ETA accuracy');
      expect(doc.mvpRoadmap.coreFeatures).toHaveLength(3);
      expect(doc.revenueModel).toHaveLength(1);
      expect(doc.competitors).toHaveLength(1);
      expect(doc.nextSteps).toHaveLength(4);
    });

    test('defensive when passed empty or null plan', () => {
      const doc = buildBusinessPlanDocument({});
      expect(doc.metadata.startupName).toBe('Your Startup');
      expect(doc.executiveSummary.elevatorPitch).toBe('Elevator pitch not generated for this plan.');
      expect(doc.leanCanvas).toEqual({});
      expect(doc.mvpRoadmap.coreFeatures).toEqual([]);
      expect(doc.revenueModel).toEqual([]);
      expect(doc.competitors).toEqual([]);
      expect(doc.nextSteps).toHaveLength(4);
    });
  });

  describe('triggerPrintWithTitle', () => {
    let originalTitle;
    let originalPrint;

    beforeEach(() => {
      originalTitle = document.title;
      originalPrint = window.print;
      window.print = jest.fn();
    });

    afterEach(() => {
      document.title = originalTitle;
      window.print = originalPrint;
      const injected = document.getElementById('startup-ai-print-page-style');
      if (injected) injected.remove();
    });

    test('sets document.title to safe suggested title and triggers window.print', () => {
      triggerPrintWithTitle('OmniFlow AI / Pitch Deck!', 'landscape');
      
      expect(document.title).toBe('OmniFlow AI - Pitch Deck!');
      expect(window.print).toHaveBeenCalledTimes(1);

      const injectedStyle = document.getElementById('startup-ai-print-page-style');
      expect(injectedStyle).not.toBeNull();
      expect(injectedStyle.textContent).toContain('size: landscape');
    });

    test('configures portrait orientation correctly', () => {
      triggerPrintWithTitle('OmniFlow-Business-Plan', 'portrait');

      expect(document.title).toBe('OmniFlow-Business-Plan');
      expect(window.print).toHaveBeenCalledTimes(1);

      const injectedStyle = document.getElementById('startup-ai-print-page-style');
      expect(injectedStyle).not.toBeNull();
      expect(injectedStyle.textContent).toContain('size: portrait');
    });
  });
});
