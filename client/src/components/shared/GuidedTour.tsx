import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'minns-tour-step';

interface TourStep {
  title: string;
  description: string;
  page: string;
  sdkMethod?: string;
}

const steps: TourStep[] = [
  {
    title: 'Welcome to the MINNS SDK Demo',
    description: 'This guided tour walks you through every feature of the MINNS SDK. Each page demonstrates real API calls — watch the sidebar light up as you explore.',
    page: '/chat',
  },
  {
    title: 'Chat — ReAct Agent',
    description: 'The agent uses a Perceive → Act → Learn loop powered by the MINNS SDK. It recalls memories, consults strategies, and emits semantic events — all visible in the side panels.',
    page: '/chat',
    sdkMethod: 'perceiveActLearn()',
  },
  {
    title: 'Dashboard — Health & Stats',
    description: 'Real-time overview of the MINNS server health, processing stats, and store metrics. This is the first thing to check when debugging.',
    page: '/dashboard',
    sdkMethod: 'getHealth() / getStats()',
  },
  {
    title: 'Memories — Three-Tier Consolidation',
    description: 'Memories flow from Episodic (raw events) → Semantic (generalized patterns) → Schema (core beliefs). Strength decays over time unless reinforced.',
    page: '/memories',
    sdkMethod: 'getAgentMemories()',
  },
  {
    title: 'Strategies — Learned Playbooks',
    description: 'The SDK automatically extracts multi-step playbooks from successful interactions. Each strategy has a quality score, failure modes, and a when-to-use guide.',
    page: '/strategies',
    sdkMethod: 'getAgentStrategies()',
  },
  {
    title: 'Graph — Knowledge Graph & Analytics',
    description: 'Explore the knowledge graph with force-directed visualization. View community detection, centrality metrics, and connected components.',
    page: '/graph',
    sdkMethod: 'getGraph() / getAnalytics()',
  },
  {
    title: 'Claims — Semantic Search',
    description: 'Claims are factual assertions extracted from events. Search them semantically using vector embeddings for RAG-style retrieval.',
    page: '/claims',
    sdkMethod: 'getClaims() / searchClaims()',
  },
  {
    title: 'NLQ — Natural Language Queries',
    description: 'Ask questions in plain English and the SDK translates them into structured graph queries. Great for analytics and reporting.',
    page: '/nlq',
    sdkMethod: 'nlq()',
  },
  {
    title: 'Structured Memory — Typed Templates',
    description: 'Store typed data structures: Ledgers for financial tracking, State Machines for workflows, Preference Lists for rankings, and Trees for hierarchies.',
    page: '/structured-memory',
    sdkMethod: 'upsertStructuredMemory()',
  },
  {
    title: 'Architecture — Full Data Flow',
    description: 'See how all the pieces fit together — from user input through the ReAct agent to the MINNS SDK and back. Click any node to jump to its demo page.',
    page: '/architecture',
  },
];

interface Props {
  onClose: () => void;
}

export default function GuidedTour({ onClose }: Props) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Math.min(parseInt(saved, 10), steps.length - 1) : 0;
  });

  const step = steps[current];

  // Navigate to the step's page
  useEffect(() => {
    navigate(step.page);
  }, [current, step.page, navigate]);

  // Persist step
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(current));
  }, [current]);

  const handlePrev = useCallback(() => {
    setCurrent(s => Math.max(0, s - 1));
  }, []);

  const handleNext = useCallback(() => {
    if (current < steps.length - 1) {
      setCurrent(s => s + 1);
    } else {
      handleFinish();
    }
  }, [current]);

  function handleFinish() {
    localStorage.removeItem(STORAGE_KEY);
    onClose();
  }

  // Keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') handleNext();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') handlePrev();
      else if (e.key === 'Escape') handleFinish();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNext, handlePrev]);

  const progress = ((current + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-fade-in">
      <div className="bg-surface-2 rounded-2xl border border-surface-4 shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-fade-in-up">
        {/* Progress bar */}
        <div className="h-1 bg-surface-4">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          {/* Step counter */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
              Step {current + 1} of {steps.length}
            </span>
            <button
              onClick={handleFinish}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Skip tour
            </button>
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">{step.description}</p>

          {/* SDK method badge */}
          {step.sdkMethod && (
            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-4 rounded-lg text-xs font-mono text-brand-300">
                <svg className="w-3 h-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {step.sdkMethod}
              </span>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={current === 0}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <div className="flex-1" />
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {current < steps.length - 1 ? 'Next' : 'Finish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
