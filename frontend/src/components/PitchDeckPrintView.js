import React from 'react';
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Rocket,
  Shield,
  DollarSign
} from 'lucide-react';
import { buildPitchDeckSlides } from '../utils/exportHelpers';

/**
 * PitchDeckPrintView
 * 
 * Specialized printable presentation container formatted for 16:9 Landscape PDF export.
 * Hidden on screen via className="print-only", visible in print media.
 * Renders exactly 7 slides with page-break-after: always between slides.
 */
const PitchDeckPrintView = ({ data }) => {
  const slides = buildPitchDeckSlides(data);
  const startupName = data?.overview?.name || 'Startup-AI Plan';

  return (
    <div id="pitch-deck-printable" className="print-only print-pitch-deck-container">
      {slides.map((slide, index) => (
        <div key={slide.id} className="print-pitch-slide">
          {/* SLIDE HEADER */}
          <div className="print-slide-header">
            <div>
              <span className="text-xs uppercase tracking-wider text-indigo-600 font-bold">
                {startupName} • Investor Pitch Deck
              </span>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                {slide.title}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full">
                Slide {slide.number} of {slides.length}
              </span>
            </div>
          </div>

          {/* SLIDE CONTENT BY TYPE */}
          <div className="print-slide-content">
            {/* Slide 1: Title Slide */}
            {slide.type === 'title' && (
              <div className="text-center py-6">
                <span className="text-xs uppercase tracking-widest text-indigo-500 font-bold px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 inline-block mb-4">
                  {slide.industry || 'Technology'} Startup
                </span>
                <h1 className="text-5xl font-extrabold text-gray-900 mb-3 tracking-tight">
                  {slide.headline}
                </h1>
                <p className="text-xl text-indigo-600 font-medium mb-8 max-w-2xl mx-auto">
                  {slide.tagline}
                </p>
                <div className="print-card max-w-2xl mx-auto text-left">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Elevator Pitch</p>
                  <p className="text-base text-gray-800 italic leading-relaxed">
                    "{slide.elevatorPitch}"
                  </p>
                </div>
              </div>
            )}

            {/* Slide 2: Problem -> Solution */}
            {slide.type === 'problem-solution' && (
              <div className="grid grid-cols-2 gap-8 my-auto">
                <div className="print-card border-l-4 border-l-red-500">
                  <div className="flex items-center space-x-2 text-red-600 mb-3">
                    <AlertCircle className="w-5 h-5" />
                    <h3 className="text-lg font-bold">The Problem</h3>
                  </div>
                  <p className="text-base text-gray-800 leading-relaxed">
                    {slide.problem}
                  </p>
                </div>

                <div className="print-card border-l-4 border-l-green-500">
                  <div className="flex items-center space-x-2 text-green-600 mb-3">
                    <CheckCircle className="w-5 h-5" />
                    <h3 className="text-lg font-bold">Our Solution</h3>
                  </div>
                  <p className="text-base text-gray-800 leading-relaxed">
                    {slide.solution}
                  </p>
                </div>
              </div>
            )}

            {/* Slide 3: Market Opportunity */}
            {slide.type === 'market-opportunity' && (
              <div className="my-auto space-y-6">
                <div className="print-card">
                  <div className="flex items-center space-x-2 text-indigo-600 mb-2">
                    <Users className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Primary Target Market</h3>
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    {slide.audience}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Key Customer Segments
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {slide.customerSegments.map((segment, idx) => (
                      <div key={idx} className="print-card text-center p-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mx-auto mb-2">
                          {idx + 1}
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{segment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Slide 4: Product Overview */}
            {slide.type === 'product-overview' && (
              <div className="my-auto space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-gray-700">Core Feature Set (Phase 1 Validation)</span>
                  <span className="text-xs bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full border border-yellow-200 font-semibold">
                    Launch Timeline: {slide.launchTimeline}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {slide.coreFeatures.length > 0 ? (
                    slide.coreFeatures.map((feat, idx) => (
                      <div key={idx} className="print-card flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {typeof feat === 'string' ? feat : (feat.feature || feat.title || JSON.stringify(feat))}
                          </p>
                          {typeof feat === 'object' && feat.description && (
                            <p className="text-xs text-gray-600 mt-0.5">{feat.description}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="print-card col-span-2 text-center text-gray-500 italic">
                      MVP features not generated for this plan.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Slide 5: Monetization */}
            {slide.type === 'monetization' && (
              <div className="my-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {slide.revenueStreams.length > 0 ? (
                    slide.revenueStreams.map((rev, idx) => (
                      <div key={idx} className="print-card">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <h4 className="font-bold text-sm text-gray-900">{rev.model || `Stream ${idx + 1}`}</h4>
                          </div>
                          {rev.projection && (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                              {rev.projection}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{rev.description}</p>
                      </div>
                    ))
                  ) : (
                    <div className="print-card col-span-2 text-center text-gray-500 italic">
                      Monetization model not generated for this plan.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Slide 6: Competition & Positioning */}
            {slide.type === 'competition' && (
              <div className="my-auto space-y-6">
                <div className="print-card border-l-4 border-l-indigo-600">
                  <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Our Unique Advantage</p>
                  <p className="text-base font-semibold text-gray-900">{slide.usp}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Key Competitors & Our Strategic Moat
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {slide.competitors.length > 0 ? (
                      slide.competitors.map((comp, idx) => (
                        <div key={idx} className="print-card">
                          <div className="flex items-center space-x-2 mb-2">
                            <Shield className="w-4 h-4 text-gray-500" />
                            <h5 className="font-bold text-sm text-gray-900">{comp.name || `Competitor ${idx + 1}`}</h5>
                          </div>
                          <div className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-100 font-medium">
                            Advantage: {comp.differentiator || 'Proprietary positioning'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="print-card col-span-3 text-center text-gray-500 italic">
                        Competitor data not generated for this plan.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Slide 7: Next Steps */}
            {slide.type === 'next-steps' && (
              <div className="my-auto space-y-6 text-center">
                <div className="print-card max-w-2xl mx-auto text-left mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Execution Summary</p>
                  <p className="text-sm text-gray-700 italic">"{slide.elevatorPitch}"</p>
                </div>

                <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
                  <div className="print-card p-6">
                    <Rocket className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                    <h4 className="font-bold text-sm text-gray-900 mb-1">1. Build MVP</h4>
                    <p className="text-xs text-gray-600">Validate core features and gather early customer feedback.</p>
                  </div>
                  <div className="print-card p-6">
                    <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-bold text-sm text-gray-900 mb-1">2. Find Customers</h4>
                    <p className="text-xs text-gray-600">Activate primary acquisition channels and validate retention.</p>
                  </div>
                  <div className="print-card p-6">
                    <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-bold text-sm text-gray-900 mb-1">3. Scale & Fund</h4>
                    <p className="text-xs text-gray-600">Leverage traction metrics to secure investment and scale.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SLIDE FOOTER */}
          <div className="print-slide-footer">
            <span>Startup-AI Pitch Presentation</span>
            <span>Confidential • Prepared for Founders & Investors</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PitchDeckPrintView;
