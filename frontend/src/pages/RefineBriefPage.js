// src/pages/RefineBriefPage.js
import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  Target,
  ArrowRight,
  ArrowLeft,
  Brain,
  Rocket,
  Plus,
  Trash2,
  Shield,
  Info
} from 'lucide-react';
import Header from '../components/Header';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const RefineBriefPage = ({ navigate, isDark, toggleTheme }) => {
  const { openAuthModal } = useAuth();
  const [brief] = useState(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('draftBrief') : null;
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Editable Facts
  const [facts, setFacts] = useState(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('draftBrief') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.facts) {
          return {
            startupName: parsed.facts.startupName || '',
            industry: parsed.facts.industry === 'Not provided' ? '' : (parsed.facts.industry || ''),
            problem: parsed.facts.problem === 'Not provided' ? '' : (parsed.facts.problem || ''),
            solution: parsed.facts.solution === 'Not provided' ? '' : (parsed.facts.solution || ''),
            targetAudience: parsed.facts.targetAudience === 'Not provided' ? '' : (parsed.facts.targetAudience || ''),
            usp: parsed.facts.usp === 'Not provided' ? '' : (parsed.facts.usp || ''),
            summary: parsed.facts.summary || ''
          };
        }
      }
    } catch {}
    return {
      startupName: '',
      industry: '',
      problem: '',
      solution: '',
      targetAudience: '',
      usp: '',
      summary: ''
    };
  });

  // Editable Assumptions
  const [assumptions, setAssumptions] = useState(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('draftBrief') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed?.assumptions)) return parsed.assumptions;
      }
    } catch {}
    return [];
  });
  const [newAssumptionText, setNewAssumptionText] = useState('');
  const [newAssumptionCategory, setNewAssumptionCategory] = useState('Market');

  // Answers to Clarification Questions
  const [questions, setQuestions] = useState(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('draftBrief') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed?.clarificationQuestions)) return parsed.clarificationQuestions;
      }
    } catch {}
    return [];
  });

  const handleFactChange = (field, value) => {
    setFacts(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleAssumption = (id) => {
    setAssumptions(prev => prev.map(a => {
      if (a.id === id) {
        const nextStatus = a.status === 'confirmed' ? 'unverified' : 'confirmed';
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  const handleDeleteAssumption = (id) => {
    setAssumptions(prev => prev.filter(a => a.id !== id));
  };

  const handleAddAssumption = (e) => {
    e.preventDefault();
    if (!newAssumptionText.trim()) return;
    const newEntry = {
      id: `asm_${Date.now()}`,
      assumption: newAssumptionText.trim(),
      category: newAssumptionCategory,
      status: 'confirmed'
    };
    setAssumptions(prev => [...prev, newEntry]);
    setNewAssumptionText('');
  };

  const handleQuestionAnswerChange = (id, answerText) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return {
          ...q,
          answer: answerText,
          answered: Boolean(answerText.trim())
        };
      }
      return q;
    }));
  };

  // Confirm Brief and Trigger Generation of All 6 Modules
  const handleConfirmAndGenerate = async () => {
    if (isGenerating) return;
    if (!facts.startupName.trim()) {
      alert('Startup Name is required to generate your business plan.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    const now = new Date().toISOString();
    const confirmedBrief = {
      schemaVersion: 1,
      status: 'confirmed',
      rawInput: brief?.rawInput || { ...facts },
      facts: {
        startupName: facts.startupName.trim(),
        industry: facts.industry.trim() || 'Not provided',
        problem: facts.problem.trim() || 'Not provided',
        solution: facts.solution.trim() || 'Not provided',
        targetAudience: facts.targetAudience.trim() || 'Not provided',
        usp: facts.usp.trim() || 'Not provided',
        summary: facts.summary.trim()
      },
      aiInterpretations: brief?.aiInterpretations || {
        category: 'General Business',
        businessModel: 'Direct Value Proposition',
        targetMarketDynamics: '',
        coreValueProposition: facts.usp.trim()
      },
      assumptions: assumptions.map(a => ({
        id: a.id,
        assumption: a.assumption,
        category: a.category || 'General',
        status: a.status || 'confirmed'
      })),
      clarificationQuestions: questions.map(q => ({
        id: q.id,
        question: q.question,
        context: q.context,
        answered: Boolean(q.answer && q.answer.trim()),
        answer: q.answer ? q.answer.trim() : ''
      })),
      metadata: {
        createdAt: brief?.metadata?.createdAt || now,
        updatedAt: now,
        confirmedAt: now
      }
    };

    // Store confirmed brief in storage
    localStorage.setItem('brief', JSON.stringify(confirmedBrief));

    // Common generation payload with attached confirmed brief
    const payload = {
      startupName: confirmedBrief.facts.startupName,
      industry: confirmedBrief.facts.industry,
      problem: confirmedBrief.facts.problem,
      solution: confirmedBrief.facts.solution,
      targetAudience: confirmedBrief.facts.targetAudience,
      usp: confirmedBrief.facts.usp,
      summary: confirmedBrief.facts.summary,
      brief: confirmedBrief
    };

    // Update formData for backward compatibility
    localStorage.setItem('formData', JSON.stringify({
      name: confirmedBrief.facts.startupName,
      domain: confirmedBrief.facts.industry,
      problem: confirmedBrief.facts.problem,
      solution: confirmedBrief.facts.solution,
      audience: confirmedBrief.facts.targetAudience,
      usp: confirmedBrief.facts.usp,
      summary: confirmedBrief.facts.summary
    }));

    const endpoints = [
      { key: 'leanCanvas', label: 'Lean Canvas', url: '/api/lean-canvas' },
      { key: 'mvp', label: 'MVP Plan', url: '/api/mvp' },
      { key: 'revenue', label: 'Revenue Model', url: '/api/revenue' },
      { key: 'pitch', label: 'Pitch Deck', url: '/api/pitch' },
      { key: 'personas', label: 'User Personas', url: '/api/personas' },
      { key: 'competitors', label: 'Competitor Analysis', url: '/api/competitors' }
    ];

    try {
      const settledResults = await Promise.allSettled(
        endpoints.map(ep => api.post(ep.url, payload))
      );

      const successfulModules = [];
      const failedModules = [];
      const persistedModules = {
        leanCanvas: null,
        mvp: null,
        revenue: null,
        pitch: null,
        personas: null,
        competitors: null
      };

      settledResults.forEach((result, idx) => {
        const ep = endpoints[idx];
        if (result.status === 'fulfilled' && result.value?.data) {
          const resData = result.value.data;
          successfulModules.push(ep.label);

          if (ep.key === 'leanCanvas') {
            persistedModules.leanCanvas = resData;
            localStorage.setItem('leanCanvas', JSON.stringify(resData));
          } else if (ep.key === 'mvp') {
            persistedModules.mvp = resData;
            localStorage.setItem('mvp', JSON.stringify(resData));
          } else if (ep.key === 'revenue') {
            persistedModules.revenue = resData;
            localStorage.setItem('revenue', JSON.stringify(resData));
          } else if (ep.key === 'pitch') {
            persistedModules.pitch = resData;
            localStorage.setItem('pitch', JSON.stringify(resData));
          } else if (ep.key === 'personas') {
            const personasData = resData.personas || resData;
            persistedModules.personas = personasData;
            localStorage.setItem('personas', JSON.stringify(personasData));
          } else if (ep.key === 'competitors') {
            const competitorsData = resData.competitors || resData;
            persistedModules.competitors = competitorsData;
            localStorage.setItem('competitors', JSON.stringify(competitorsData));
          }
        } else {
          const errMessage = result.reason?.response?.data?.error?.message ||
            result.reason?.response?.data?.error ||
            result.reason?.message ||
            'Request failed';
          failedModules.push({ label: ep.label, error: errMessage });
          console.warn(`[Refine Generation] Module ${ep.label} failed:`, errMessage);
        }
      });

      // Complete failure
      if (successfulModules.length === 0) {
        setIsGenerating(false);
        const detailedErrors = failedModules.map(m => `• ${m.label}: ${m.error}`).join('\n');
        alert(`Failed to generate modules from Startup Brief:\n\n${detailedErrors}\n\nPlease try again.`);
        return;
      }

      // Partial failure record
      let genErrorsObj = null;
      if (failedModules.length > 0) {
        genErrorsObj = {
          failedModules: failedModules.map(m => m.label),
          successfulModules
        };
        localStorage.setItem('generationErrors', JSON.stringify(genErrorsObj));
      } else {
        localStorage.removeItem('generationErrors');
      }

      // Persist plan with confirmed brief to backend database
      const isPartial = failedModules.length > 0;
      const planPayload = {
        startupName: confirmedBrief.facts.startupName,
        industry: confirmedBrief.facts.industry,
        problem: confirmedBrief.facts.problem,
        solution: confirmedBrief.facts.solution,
        targetAudience: confirmedBrief.facts.targetAudience,
        usp: confirmedBrief.facts.usp,
        brief: confirmedBrief,
        leanCanvas: persistedModules.leanCanvas,
        mvp: persistedModules.mvp,
        revenue: persistedModules.revenue,
        pitch: persistedModules.pitch,
        personas: persistedModules.personas,
        competitors: persistedModules.competitors,
        generationStatus: isPartial ? 'partial' : 'completed',
        generationErrors: genErrorsObj
      };

      try {
        const persistRes = await api.post('/api/plans', planPayload);
        const serverPlanId = persistRes.data?.data?.id;
        if (serverPlanId) {
          localStorage.setItem('currentPlanId', serverPlanId);
          localStorage.setItem('planPersistenceStatus', 'saved');
        } else {
          localStorage.setItem('planPersistenceStatus', 'save_failed');
          localStorage.removeItem('currentPlanId');
        }
      } catch (persistErr) {
        if (persistErr.response?.status === 403 && persistErr.response?.data?.error?.code === 'TRIAL_LIMIT_REACHED') {
          localStorage.setItem('planPersistenceStatus', 'trial_limit_reached');
          setIsGenerating(false);
          openAuthModal({
            title: 'Free Trial Plan Already Saved',
            subtitle: 'Sign in or create an account to save additional business plans.',
            onAuthSuccess: async () => {
              try {
                const retryRes = await api.post('/api/plans', planPayload);
                const retryId = retryRes.data?.data?.id;
                if (retryId) {
                  localStorage.setItem('currentPlanId', retryId);
                  localStorage.setItem('planPersistenceStatus', 'saved');
                }
              } catch (retryErr) {
                console.error('[Refine] Retry persistence failed:', retryErr.message);
              }
              navigate('/dashboard');
            }
          });
          return;
        } else {
          console.error('[Refine] Persistence failed:', persistErr.message);
          localStorage.setItem('planPersistenceStatus', 'save_failed');
          localStorage.removeItem('currentPlanId');
        }
      }

      setIsGenerating(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('[Refine] Module generation error:', err);
      setIsGenerating(false);
      setErrorMessage(err.message || 'An error occurred during module generation.');
    }
  };

  // Empty state if no brief is found in storage
  if (!brief) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lightbulb className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold mb-4">No Draft Brief Found</h2>
          <p className={`text-lg mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Please enter your startup idea to draft your canonical Startup Brief before refining.
          </p>
          <button
            onClick={() => navigate('/start')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold inline-flex items-center space-x-2"
          >
            <span>Enter Startup Idea</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Loading generation state
  if (isGenerating) {
    return (
      <div className={`min-h-screen flex items-center justify-center relative overflow-hidden ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center relative z-10 max-w-lg px-4">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto mb-4 relative">
              <div className={`absolute inset-2 rounded-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}></div>
            </div>
            <Rocket className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>

          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Generating Complete Business Plan...
          </h2>
          <p className={`text-lg mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Aligning Lean Canvas, MVP Roadmap, Revenue Model, Personas, Competitors, and Pitch Deck with your confirmed brief.
          </p>

          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="flex space-x-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative overflow-hidden ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        {/* Header Breadcrumb & Title */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/start')}
            className={`inline-flex items-center space-x-2 text-sm font-medium mb-4 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Idea Intake</span>
          </button>

          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold mb-3 shadow">
            <Shield className="w-3.5 h-3.5" />
            <span>Canonical Startup Brief • Version 1 (Draft)</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Review & Refine Your Startup Brief
          </h1>
          <p className={`text-base md:text-lg max-w-3xl ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            We've structured your idea into verified facts, AI interpretations, and key assumptions.
            Review and adjust any details below before generating your comprehensive business plan.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{errorMessage}</span>
          </div>
        )}

        {/* Section 1: AI Interpretations Banner */}
        <div className={`rounded-3xl p-6 mb-8 border ${isDark ? 'bg-gradient-to-br from-indigo-950/40 to-purple-950/30 border-indigo-800/50' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'} shadow-sm`}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold">AI Structured Interpretation</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  AI-Generated
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Derived from your idea to ensure cross-module consistency
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <div className={`text-xs font-semibold mb-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Category</div>
              <div className="font-bold text-sm">{brief?.aiInterpretations?.category || 'General Business'}</div>
            </div>

            <div className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <div className={`text-xs font-semibold mb-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Business Model</div>
              <div className="font-bold text-sm">{brief?.aiInterpretations?.businessModel || 'Direct Value Delivery'}</div>
            </div>

            <div className={`p-4 rounded-2xl sm:col-span-2 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <div className={`text-xs font-semibold mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Market Dynamics</div>
              <div className="text-xs leading-relaxed line-clamp-2">{brief?.aiInterpretations?.targetMarketDynamics || 'Active addressable market with clear demand.'}</div>
            </div>
          </div>

          {brief?.aiInterpretations?.coreValueProposition && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start space-x-2.5 ${isDark ? 'bg-indigo-900/40 text-indigo-200 border border-indigo-800/50' : 'bg-indigo-100/60 text-indigo-800 border border-indigo-200'}`}>
              <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-500" />
              <div>
                <span className="font-semibold">Core Value Proposition: </span>
                {brief.aiInterpretations.coreValueProposition}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Core Business Facts (Founder Confirmed) */}
        <div className={`rounded-3xl p-6 md:p-8 mb-8 border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold">Core Business Facts</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    Founder Verified
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Direct founder inputs. You can edit any field to refine your positioning.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Startup Name *
              </label>
              <input
                type="text"
                required
                value={facts.startupName}
                onChange={(e) => handleFactChange('startupName', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${isDark ? 'bg-gray-700/60 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Domain / Industry
              </label>
              <input
                type="text"
                value={facts.industry}
                onChange={(e) => handleFactChange('industry', e.target.value)}
                placeholder="e.g., Healthcare, FinTech, E-Commerce"
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all ${isDark ? 'bg-gray-700/60 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none`}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Problem Statement *
              </label>
              <textarea
                rows={3}
                required
                value={facts.problem}
                onChange={(e) => handleFactChange('problem', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all ${isDark ? 'bg-gray-700/60 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none`}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Proposed Solution *
              </label>
              <textarea
                rows={3}
                required
                value={facts.solution}
                onChange={(e) => handleFactChange('solution', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all ${isDark ? 'bg-gray-700/60 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Target Audience *
              </label>
              <input
                type="text"
                required
                value={facts.targetAudience}
                onChange={(e) => handleFactChange('targetAudience', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all ${isDark ? 'bg-gray-700/60 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Unique Selling Proposition (USP) *
              </label>
              <input
                type="text"
                required
                value={facts.usp}
                onChange={(e) => handleFactChange('usp', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all ${isDark ? 'bg-gray-700/60 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none`}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Idea Summary (Optional Founder Notes)
              </label>
              <textarea
                rows={2}
                value={facts.summary}
                onChange={(e) => handleFactChange('summary', e.target.value)}
                placeholder="Additional vision, monetization ideas, or constraints..."
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all ${isDark ? 'bg-gray-700/60 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none`}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Key Assumptions */}
        <div className={`rounded-3xl p-6 md:p-8 mb-8 border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-white">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold">Key Assumptions</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    Explicitly Hypothesized
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Review what must hold true for your business model. You can verify, edit, add, or delete assumptions.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {assumptions.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between space-x-4 ${
                  item.status === 'confirmed'
                    ? isDark ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-emerald-50/60 border-emerald-200'
                    : isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <button
                    type="button"
                    onClick={() => handleToggleAssumption(item.id)}
                    className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      item.status === 'confirmed'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : isDark ? 'border-gray-500 hover:border-emerald-400' : 'border-gray-400 hover:border-emerald-600'
                    }`}
                    title={item.status === 'confirmed' ? 'Mark unverified' : 'Mark confirmed'}
                  >
                    {item.status === 'confirmed' && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                        item.category === 'Market'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                          : item.category === 'Product'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {item.category}
                      </span>
                      <span className={`text-[11px] ${item.status === 'confirmed' ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                        {item.status === 'confirmed' ? 'Confirmed by Founder' : 'Unverified Assumption'}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{item.assumption || item.statement || item.text}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteAssumption(item.id)}
                  className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                  title="Remove assumption"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Assumption Inline Form */}
          <form onSubmit={handleAddAssumption} className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="text"
              value={newAssumptionText}
              onChange={(e) => setNewAssumptionText(e.target.value)}
              placeholder="Add another key assumption..."
              className={`flex-1 px-4 py-2.5 rounded-xl border text-sm transition-all ${isDark ? 'bg-gray-700/60 border-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-300 focus:border-indigo-500'} focus:outline-none`}
            />
            <select
              value={newAssumptionCategory}
              onChange={(e) => setNewAssumptionCategory(e.target.value)}
              className={`px-3 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}
            >
              <option value="Market">Market</option>
              <option value="Product">Product</option>
              <option value="Financial">Financial</option>
              <option value="Operations">Operations</option>
            </select>
            <button
              type="submit"
              disabled={!newAssumptionText.trim()}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Section 4: Clarification Questions (Optional) */}
        {questions.length > 0 && (
          <div className={`rounded-3xl p-6 md:p-8 mb-8 border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} shadow-lg`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center text-white">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold">Clarification Questions</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                    Optional
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Answering these will help sharpen your modules. You can skip any or all questions without issue.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id || idx} className={`p-5 rounded-2xl border ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start space-x-3 mb-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold">{q.question}</h4>
                      {q.context && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Info className="w-3.5 h-3.5 inline mr-1 opacity-70" />
                          {q.context}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <textarea
                      rows={2}
                      value={q.answer || ''}
                      onChange={(e) => handleQuestionAnswerChange(q.id, e.target.value)}
                      placeholder="Optional founder answer..."
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all ${isDark ? 'bg-gray-700/50 border-gray-600 focus:border-indigo-500' : 'bg-white border-gray-300 focus:border-indigo-500'} focus:outline-none`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Confirmation CTA */}
        <div className={`rounded-3xl p-8 text-center border ${isDark ? 'bg-gradient-to-r from-gray-800 to-gray-750 border-gray-700' : 'bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-indigo-100'} shadow-xl`}>
          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Ready to Generate Your Startup Plan?
          </h3>
          <p className={`text-sm md:text-base max-w-xl mx-auto mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Confirming this brief locks in the foundation for your Lean Canvas, MVP Roadmap, Revenue Model, Personas, Competitors, and Pitch Deck.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/start')}
              disabled={isGenerating}
              className={`w-full sm:w-auto px-6 py-4 rounded-xl text-sm font-semibold border ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-700'} transition-all`}
            >
              Back to Edit Idea
            </button>

            <button
              type="button"
              onClick={handleConfirmAndGenerate}
              disabled={isGenerating || !facts.startupName.trim()}
              className="w-full sm:w-auto group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-10 py-4 rounded-xl text-base font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>Confirm Brief & Generate All Modules</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefineBriefPage;
