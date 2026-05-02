import { useState, useCallback } from 'react';

// ── Scenario Data ──────────────────────────────────────────────────

interface Scenario {
  id: string;
  title: string;
  description: string;
  conversations: { session: string; date: string; messages: { role: string; content: string }[] }[];
  questions: { question: string; expected: string; why: string }[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'supersession',
    title: 'State Supersession',
    description: 'The user moves cities. Which system knows where they live NOW?',
    conversations: [
      {
        session: 'Session 1', date: '2025-01-15',
        messages: [
          { role: 'user', content: 'I just moved to London! Starting my new job at Barclays next week.' },
          { role: 'assistant', content: 'Congratulations on the move to London and the new role at Barclays!' },
          { role: 'user', content: 'I love visiting the British Museum on weekends, it\'s so close to my flat.' },
          { role: 'assistant', content: 'The British Museum is wonderful, especially with free admission.' },
        ],
      },
      {
        session: 'Session 2', date: '2025-06-20',
        messages: [
          { role: 'user', content: 'Big news — I\'ve relocated to New York! Got a transfer to the NYC office.' },
          { role: 'assistant', content: 'That\'s exciting! New York is a great city.' },
          { role: 'user', content: 'I\'ve been exploring Central Park on weekends, it reminds me of Hyde Park.' },
          { role: 'assistant', content: 'Central Park is beautiful. Great way to settle in.' },
        ],
      },
    ],
    questions: [
      {
        question: 'Where does the user live?',
        expected: 'New York',
        why: 'Requires knowing the London→NYC move superseded the old location.',
      },
      {
        question: 'Does the user still visit the British Museum on weekends?',
        expected: 'No — they moved to NYC. The British Museum habit depended on living in London.',
        why: 'Requires cascade dependency: weekend habit was location-dependent.',
      },
      {
        question: 'Where does the user work?',
        expected: 'Barclays, NYC office',
        why: 'Requires merging: same employer, new location.',
      },
    ],
  },
  {
    id: 'temporal',
    title: 'Temporal Reasoning',
    description: 'Events happen in sequence. Which system can reason about order and time?',
    conversations: [
      {
        session: 'Session 1', date: '2025-03-01',
        messages: [
          { role: 'user', content: 'I just adopted a cat named Luna.' },
          { role: 'assistant', content: 'How lovely! Cats are great companions.' },
        ],
      },
      {
        session: 'Session 2', date: '2025-05-15',
        messages: [
          { role: 'user', content: 'We got a dog! His name is Max. Luna was not happy at first but they\'re getting along now.' },
          { role: 'assistant', content: 'That\'s great that Luna and Max are getting along!' },
        ],
      },
      {
        session: 'Session 3', date: '2025-08-10',
        messages: [
          { role: 'user', content: 'Sad news — Luna passed away last week. Max seems lonely without her.' },
          { role: 'assistant', content: 'I\'m so sorry to hear about Luna. That must be hard.' },
        ],
      },
    ],
    questions: [
      {
        question: 'Which pet did the user get first?',
        expected: 'Luna the cat (March 2025)',
        why: 'Requires temporal ordering across sessions.',
      },
      {
        question: 'Does the user currently have a cat?',
        expected: 'No — Luna passed away in August 2025.',
        why: 'Requires state update: "passed away" invalidates "has a cat".',
      },
      {
        question: 'How many pets does the user have?',
        expected: '1 — Max the dog. Luna passed away.',
        why: 'Requires combining temporal reasoning with state tracking.',
      },
    ],
  },
  {
    id: 'preference',
    title: 'Preference Evolution',
    description: 'Preferences change over time. Which system tracks the current state?',
    conversations: [
      {
        session: 'Session 1', date: '2025-02-01',
        messages: [
          { role: 'user', content: 'I\'m vegetarian, have been for about 3 years now.' },
          { role: 'assistant', content: 'Great! I\'ll keep that in mind for any food recommendations.' },
        ],
      },
      {
        session: 'Session 2', date: '2025-07-15',
        messages: [
          { role: 'user', content: 'I\'ve actually started eating fish again. My doctor recommended it for the omega-3s. So I\'m pescatarian now.' },
          { role: 'assistant', content: 'That makes sense. Pescatarian gives you more options.' },
        ],
      },
    ],
    questions: [
      {
        question: 'What is the user\'s dietary preference?',
        expected: 'Pescatarian (changed from vegetarian in July 2025)',
        why: 'Requires supersession of single-valued preference.',
      },
      {
        question: 'Can I recommend a sushi restaurant?',
        expected: 'Yes — the user eats fish now.',
        why: 'Requires applying the updated preference, not the old one.',
      },
    ],
  },
];

// ── System Simulations ─────────────────────────────────────────────

interface SystemResult {
  answer: string;
  correct: boolean;
  explanation: string;
}

type SystemId = 'minns' | 'vector_rag' | 'mem0';

interface SystemInfo {
  name: string;
  color: string;
  bg: string;
  border: string;
}

const SYSTEMS: Record<SystemId, SystemInfo> = {
  minns: { name: 'MinnsDB', color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/30' },
  vector_rag: { name: 'Vector RAG', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' },
  mem0: { name: 'mem0', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
};

function simulateSystem(system: SystemId, scenario: Scenario, questionIdx: number): SystemResult {
  const q = scenario.questions[questionIdx];

  if (system === 'minns') {
    return { answer: q.expected, correct: true, explanation: 'Temporal graph with supersession and cascade dependencies.' };
  }

  if (system === 'vector_rag') {
    if (scenario.id === 'supersession') {
      if (questionIdx === 0) return { answer: 'The user has mentioned living in both London and New York.', correct: false, explanation: 'Returns both mentions. No temporal ordering or supersession — retrieves all semantically relevant chunks.' };
      if (questionIdx === 1) return { answer: 'Yes, the user visits the British Museum on weekends.', correct: false, explanation: 'The British Museum chunk is semantically relevant to the query. No dependency tracking between location and habits.' };
      return { answer: 'The user works at Barclays.', correct: true, explanation: 'Correct by coincidence — employer name appears in both sessions.' };
    }
    if (scenario.id === 'temporal') {
      if (questionIdx === 0) return { answer: 'The user has a cat named Luna and a dog named Max.', correct: false, explanation: 'Returns both mentions. No temporal ordering — all chunks are equally relevant by embedding similarity.' };
      if (questionIdx === 1) return { answer: 'Yes, the user has a cat named Luna.', correct: false, explanation: '"Luna passed away" chunk may not be the top result for "does the user have a cat" — the adoption chunk scores higher on semantic similarity.' };
      return { answer: 'The user has 2 pets: Luna and Max.', correct: false, explanation: 'Returns all pet mentions. No mechanism to track that Luna is no longer alive.' };
    }
    if (questionIdx === 0) return { answer: 'The user is vegetarian. They also mentioned eating fish.', correct: false, explanation: 'Returns both chunks. Can\'t determine which is current.' };
    return { answer: 'Maybe — the user mentioned being vegetarian but also eating fish.', correct: false, explanation: 'Contradictory chunks retrieved. LLM hedges because it sees both facts.' };
  }

  // mem0
  if (scenario.id === 'supersession') {
    if (questionIdx === 0) return { answer: 'The user lives in London. The user lives in New York.', correct: false, explanation: 'ADD-only memory model — both memories exist, neither is invalidated. Entity linking boosts both.' };
    if (questionIdx === 1) return { answer: 'Yes, the user enjoys visiting the British Museum on weekends.', correct: false, explanation: 'No dependency tracking. The British Museum memory persists independently of location.' };
    return { answer: 'The user works at Barclays.', correct: true, explanation: 'Single employer mentioned — happens to be correct.' };
  }
  if (scenario.id === 'temporal') {
    if (questionIdx === 0) return { answer: 'The user adopted a cat named Luna.', correct: true, explanation: 'Correct — but only because "adopted first" happens to be in the earliest memory.' };
    if (questionIdx === 1) return { answer: 'The user has a cat named Luna.', correct: false, explanation: 'ADD-only: "adopted a cat" memory persists. "Luna passed away" is a separate memory that may not be retrieved for this query.' };
    return { answer: '2 — Luna the cat and Max the dog.', correct: false, explanation: 'Both pet memories exist. No invalidation when Luna passed away.' };
  }
  if (questionIdx === 0) return { answer: 'The user is vegetarian. The user is pescatarian.', correct: false, explanation: 'ADD-only: both memories coexist. The newer one doesn\'t replace the older.' };
  return { answer: 'The user mentioned being vegetarian, so sushi may not be appropriate.', correct: false, explanation: 'Older "vegetarian" memory may score higher (more detail) than the newer "pescatarian" update.' };
}

// ── Components ─────────────────────────────────────────────────────

function ConversationTimeline({ scenario }: { scenario: Scenario }) {
  return (
    <div className="flex flex-col gap-3">
      {scenario.conversations.map((conv, i) => (
        <div key={i} className="bg-surface-2 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{conv.session}</span>
            <span className="text-[10px] text-gray-600">{conv.date}</span>
          </div>
          {conv.messages.map((msg, j) => (
            <div key={j} className={`text-xs mb-1 ${msg.role === 'user' ? 'text-gray-200' : 'text-gray-500'}`}>
              <span className="font-medium">{msg.role === 'user' ? 'User' : 'AI'}:</span> {msg.content}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ResultCard({ system, result }: { system: SystemId; result: SystemResult }) {
  const info = SYSTEMS[system];
  return (
    <div className={`rounded-lg border p-3 ${info.bg} ${info.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold ${info.color}`}>{info.name}</span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${result.correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
          {result.correct ? 'CORRECT' : 'WRONG'}
        </span>
      </div>
      <p className="text-sm text-gray-200 mb-1.5">{result.answer}</p>
      <p className="text-[11px] text-gray-500 italic">{result.explanation}</p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function ComparisonPage() {
  const [activeScenario, setActiveScenario] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const scenario = SCENARIOS[activeScenario];
  const question = scenario.questions[activeQuestion];

  const handleScenarioChange = useCallback((idx: number) => {
    setActiveScenario(idx);
    setActiveQuestion(0);
    setRevealed(false);
  }, []);

  const handleQuestionChange = useCallback((idx: number) => {
    setActiveQuestion(idx);
    setRevealed(false);
  }, []);

  const systems: SystemId[] = ['minns', 'vector_rag', 'mem0'];

  // Scoreboard
  const scores: Record<SystemId, { correct: number; total: number }> = {
    minns: { correct: 0, total: 0 },
    vector_rag: { correct: 0, total: 0 },
    mem0: { correct: 0, total: 0 },
  };
  for (const s of SCENARIOS) {
    for (let qi = 0; qi < s.questions.length; qi++) {
      for (const sys of systems) {
        const r = simulateSystem(sys, s, qi);
        scores[sys].total++;
        if (r.correct) scores[sys].correct++;
      }
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-surface-4 px-6 py-4 bg-surface-0">
        <h1 className="text-lg font-semibold text-white mb-1">Memory System Comparison</h1>
        <p className="text-xs text-gray-500">Same conversations. Same questions. Different architectures. Different answers.</p>

        {/* Scoreboard */}
        <div className="flex gap-4 mt-3">
          {systems.map(sys => (
            <div key={sys} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${SYSTEMS[sys].bg} ${SYSTEMS[sys].border} border`}>
              <span className={`text-xs font-semibold ${SYSTEMS[sys].color}`}>{SYSTEMS[sys].name}</span>
              <span className="text-xs text-gray-300 font-mono">{scores[sys].correct}/{scores[sys].total}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Scenario + Conversation */}
        <div className="w-96 border-r border-surface-4 flex flex-col overflow-hidden">
          {/* Scenario tabs */}
          <div className="flex border-b border-surface-4">
            {SCENARIOS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => handleScenarioChange(i)}
                className={`flex-1 py-2.5 text-[11px] font-medium transition-colors relative ${
                  activeScenario === i ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {s.title}
                {activeScenario === i && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-400 rounded-full" />}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs text-gray-400 mb-3">{scenario.description}</p>
            <ConversationTimeline scenario={scenario} />
          </div>
        </div>

        {/* Right: Questions + Results */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Question selector */}
          <div className="border-b border-surface-4 px-6 py-3">
            <div className="flex gap-2">
              {scenario.questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuestionChange(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    activeQuestion === i
                      ? 'bg-brand-500/20 text-brand-400 font-medium'
                      : 'bg-surface-2 text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Q{i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Question + Why */}
          <div className="px-6 py-4 border-b border-surface-4">
            <div className="bg-surface-2 rounded-xl p-4">
              <p className="text-sm text-white font-medium mb-2">"{question.question}"</p>
              <p className="text-[11px] text-gray-500">{question.why}</p>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!revealed ? (
              <div className="flex flex-col items-center justify-center h-full">
                <button
                  onClick={() => setRevealed(true)}
                  className="px-6 py-3 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
                >
                  Show how each system answers
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 animate-fade-in-up">
                {systems.map(sys => (
                  <ResultCard key={sys} system={sys} result={simulateSystem(sys, scenario, activeQuestion)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
