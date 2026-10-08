/**
 * frontend/src/utils/exportHelpers.js
 * 
 * Pure helpers for extracting canonical plan data and transforming
 * it into structured Pitch Deck presentation slides and Business Plan
 * printable document models.
 * 
 * Also provides a robust, cross-browser native print utility that handles
 * document titles and dynamic @page orientation without conflicting.
 */

/**
 * Normalizes plan data from either a persisted plan object, dashboard state,
 * or browser localStorage into a consistent, null-safe structure.
 * 
 * @param {object} [rawSource] - Optional plan object from state or API
 * @returns {object} Normalized plan data object
 */
export function normalizePlanData(rawSource = null) {
  let source = rawSource;

  // If no source provided, fall back to localStorage
  if (!source || typeof source !== 'object') {
    try {
      const formData = JSON.parse(localStorage.getItem('formData') || '{}');
      const leanCanvas = JSON.parse(localStorage.getItem('leanCanvas') || 'null');
      const mvp = JSON.parse(localStorage.getItem('mvp') || 'null');
      const revenue = JSON.parse(localStorage.getItem('revenue') || 'null');
      const pitch = JSON.parse(localStorage.getItem('pitch') || 'null');
      const personas = JSON.parse(localStorage.getItem('personas') || 'null');
      const competitors = JSON.parse(localStorage.getItem('competitors') || 'null');

      source = {
        overview: {
          name: formData.name || leanCanvas?.startupName || 'Your Startup',
          industry: formData.domain || leanCanvas?.industry || '',
          problem: formData.problem || leanCanvas?.problem || '',
          solution: formData.solution || leanCanvas?.solution || '',
          audience: formData.audience || leanCanvas?.audience || leanCanvas?.customerSegments || '',
          usp: formData.usp || leanCanvas?.uniqueValueProposition || ''
        },
        leanCanvas,
        mvp,
        revenue,
        pitch,
        personas,
        competitors
      };
    } catch {
      source = {};
    }
  }

function parseIfString(val) {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

  const overview = source.overview || {
    name: source.startupName || source.leanCanvas?.startupName || 'Your Startup',
    industry: source.industry || source.domain || source.leanCanvas?.industry || '',
    problem: source.problem || source.problemStatement || source.leanCanvas?.problem || '',
    solution: source.solution || source.proposedSolution || source.leanCanvas?.solution || '',
    audience: source.targetAudience || source.audience || source.leanCanvas?.audience || source.leanCanvas?.customerSegments || '',
    usp: source.usp || source.uniqueValueProposition || source.leanCanvas?.uniqueValueProposition || ''
  };

  const leanCanvasRaw = source.leanCanvas ?? source.lean_canvas ?? null;
  const mvpRaw = source.mvp ?? null;
  const revenueRaw = source.revenue ?? null;
  const pitchRaw = source.pitch ?? null;
  const personasRaw = source.personas ?? null;
  const competitorsRaw = source.competitors ?? null;

  return {
    name: overview.name || 'Your Startup',
    overview: {
      name: overview.name || 'Your Startup',
      industry: overview.industry || '',
      problem: overview.problem || '',
      solution: overview.solution || '',
      audience: typeof overview.audience === 'string' ? overview.audience : (Array.isArray(overview.audience) ? overview.audience.join(', ') : ''),
      usp: overview.usp || ''
    },
    leanCanvas: parseIfString(leanCanvasRaw),
    mvp: parseIfString(mvpRaw),
    revenue: parseIfString(revenueRaw),
    pitch: parseIfString(pitchRaw),
    personas: parseIfString(personasRaw),
    competitors: parseIfString(competitorsRaw)
  };
}

/**
 * Transforms normalized plan data into the canonical 7-slide Pitch Deck model.
 * 
 * @param {object} planData - Normalized plan data
 * @returns {Array} Array of 7 slide definitions
 */
export function buildPitchDeckSlides(planData) {
  const data = normalizePlanData(planData);
  const overview = data.overview;
  const leanCanvas = data.leanCanvas || {};
  const mvp = data.mvp;
  const revenue = Array.isArray(data.revenue) ? data.revenue : [];
  const pitch = data.pitch;
  const competitors = Array.isArray(data.competitors) ? data.competitors : [];

  // Extract core features defensive against both object and array formats
  const mvpFeatures = mvp?.coreFeatures || (Array.isArray(mvp) ? mvp : []);
  
  // Extract customer segments
  const customerSegments = leanCanvas?.customerSegments || [overview.audience || 'Target Market'];

  const elevatorPitch = pitch?.elevatorPitch || 'AI-generated elevator pitch not available for this plan.';

  return [
    {
      id: 1,
      number: 1,
      type: 'title',
      title: 'Title Slide',
      headline: overview.name,
      tagline: overview.usp || 'Innovative Solution for the Modern Market',
      industry: overview.industry,
      elevatorPitch: elevatorPitch
    },
    {
      id: 2,
      number: 2,
      type: 'problem-solution',
      title: 'Problem → Solution',
      problem: overview.problem || 'No specific problem description provided.',
      solution: overview.solution || 'No specific solution description provided.'
    },
    {
      id: 3,
      number: 3,
      type: 'market-opportunity',
      title: 'Market Opportunity',
      audience: overview.audience || 'Target customer group not specified.',
      customerSegments: Array.isArray(customerSegments) ? customerSegments : [customerSegments]
    },
    {
      id: 4,
      number: 4,
      type: 'product-overview',
      title: 'Product Overview',
      coreFeatures: Array.isArray(mvpFeatures) ? mvpFeatures : [],
      launchTimeline: mvp?.launchTimeline || '6-8 weeks for public MVP beta'
    },
    {
      id: 5,
      number: 5,
      type: 'monetization',
      title: 'Monetization & Revenue',
      revenueStreams: revenue
    },
    {
      id: 6,
      number: 6,
      type: 'competition',
      title: 'Competition & Market Position',
      usp: overview.usp || 'Defensible competitive advantage',
      competitors: competitors.slice(0, 3)
    },
    {
      id: 7,
      number: 7,
      type: 'next-steps',
      title: 'Next Steps & Launch Strategy',
      elevatorPitch: elevatorPitch,
      milestones: [
        { label: 'Build MVP', description: 'Validate core features and gather early customer feedback' },
        { label: 'Find Customers', description: 'Acquire early adopters through targeted distribution channels' },
        { label: 'Scale & Fund', description: 'Achieve product-market fit and accelerate traction' }
      ]
    }
  ];
}

/**
 * Transforms normalized plan data into a structured Business Plan document model.
 * 
 * @param {object} planData - Normalized plan data
 * @returns {object} Structured document sections
 */
export function buildBusinessPlanDocument(planData) {
  const data = normalizePlanData(planData);
  const overview = data.overview;
  const leanCanvas = data.leanCanvas || {};
  const mvp = data.mvp;
  const revenue = Array.isArray(data.revenue) ? data.revenue : [];
  const pitch = data.pitch;
  const personas = Array.isArray(data.personas) ? data.personas : [];
  const competitors = Array.isArray(data.competitors) ? data.competitors : [];

  const mvpFeatures = mvp?.coreFeatures || (Array.isArray(mvp) ? mvp : []);

  return {
    metadata: {
      startupName: overview.name,
      industry: overview.industry || 'Technology / General',
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    },
    executiveSummary: {
      startupName: overview.name,
      elevatorPitch: pitch?.elevatorPitch || 'Elevator pitch not generated for this plan.',
      usp: overview.usp || 'Not specified'
    },
    companyOverview: {
      startupName: overview.name,
      industry: overview.industry || 'Not specified',
      problem: overview.problem || 'Not specified',
      solution: overview.solution || 'Not specified',
      targetAudience: overview.audience || 'Not specified',
      usp: overview.usp || 'Not specified'
    },
    marketAndPersonas: {
      targetAudience: overview.audience || 'Not specified',
      personas: personas
    },
    leanCanvas: leanCanvas,
    mvpRoadmap: {
      coreFeatures: Array.isArray(mvpFeatures) ? mvpFeatures : [],
      technicalRequirements: mvp?.technicalRequirements || mvp?.techStack || null,
      launchTimeline: mvp?.launchTimeline || '6-8 weeks'
    },
    revenueModel: revenue,
    competitors: competitors,
    nextSteps: [
      { step: '1. MVP Validation', detail: 'Develop and launch core features to target user personas.' },
      { step: '2. Go-To-Market', detail: 'Activate primary customer acquisition channels and gather metrics.' },
      { step: '3. Monetization', detail: 'Deploy pricing tiers and validate customer willing-to-pay economics.' },
      { step: '4. Growth & Funding', detail: 'Leverage defensible advantages and traction to raise capital.' }
    ]
  };
}

/**
 * Triggers native browser print with a clean suggested document title
 * and dynamically scoped @page orientation (landscape or portrait).
 * Restores original document title and cleans up styles immediately after printing.
 * 
 * @param {string} suggestedTitle - Temporary document title (suggests PDF file name)
 * @param {'landscape' | 'portrait'} [orientation='portrait'] - Print orientation
 */
export function triggerPrintWithTitle(suggestedTitle, orientation = 'portrait') {
  if (typeof window === 'undefined') return;

  const originalTitle = document.title;
  if (suggestedTitle && typeof suggestedTitle === 'string') {
    // Sanitize title for filename safety
    const safeTitle = suggestedTitle.replace(/[/\\?%*:|"<>]/g, '-').trim();
    document.title = safeTitle;
  }

  // Inject or update orientation rule in head
  let styleEl = document.getElementById('startup-ai-print-page-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'startup-ai-print-page-style';
    document.head.appendChild(styleEl);
  }

  if (orientation === 'landscape') {
    styleEl.textContent = '@page { size: landscape; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }';
    document.body.classList.add('printing-landscape');
    document.body.classList.remove('printing-portrait');
  } else {
    styleEl.textContent = '@page { size: portrait; margin: 12mm 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }';
    document.body.classList.add('printing-portrait');
    document.body.classList.remove('printing-landscape');
  }

  const cleanup = () => {
    document.title = originalTitle;
    document.body.classList.remove('printing-landscape');
    document.body.classList.remove('printing-portrait');
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  try {
    if (typeof window.print === 'function') {
      window.print();
    }
  } catch (err) {
    console.error('[Print] Print failed:', err);
  } finally {
    // Safety fallback timeout in case afterprint does not fire in headless/automated environments
    setTimeout(cleanup, 2500);
  }
}
