import { useState, useCallback } from 'react';

// ── Scenario Data ──────────────────────────────────────────────────

interface Message { role: string; content: string; }
interface ConvSession { session: string; date: string; messages: Message[]; }
interface Question { question: string; expected: string; why: string; }

interface Scenario {
  id: string;
  title: string;
  description: string;
  conversations: ConvSession[];
  questions: Question[];
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
      { question: 'Where does the user live?', expected: 'New York', why: 'Requires knowing the London→NYC move superseded the old location.' },
      { question: 'Does the user still visit the British Museum on weekends?', expected: 'No — they moved to NYC.', why: 'Requires cascade dependency: weekend habit was location-dependent.' },
      { question: 'Where does the user work?', expected: 'Barclays, NYC office', why: 'Requires merging: same employer, new location.' },
    ],
  },
  {
    id: 'temporal',
    title: 'Temporal Reasoning',
    description: 'Events happen in sequence. Which system can reason about order and time?',
    conversations: [
      { session: 'Session 1', date: '2025-03-01', messages: [
        { role: 'user', content: 'I just adopted a cat named Luna.' },
        { role: 'assistant', content: 'How lovely! Cats are great companions.' },
      ]},
      { session: 'Session 2', date: '2025-05-15', messages: [
        { role: 'user', content: 'We got a dog! His name is Max. Luna was not happy at first but they\'re getting along now.' },
        { role: 'assistant', content: 'That\'s great that Luna and Max are getting along!' },
      ]},
      { session: 'Session 3', date: '2025-08-10', messages: [
        { role: 'user', content: 'Sad news — Luna passed away last week. Max seems lonely without her.' },
        { role: 'assistant', content: 'I\'m so sorry to hear about Luna. That must be hard.' },
      ]},
    ],
    questions: [
      { question: 'Which pet did the user get first?', expected: 'Luna the cat (March 2025)', why: 'Requires temporal ordering across sessions.' },
      { question: 'Does the user currently have a cat?', expected: 'No — Luna passed away.', why: 'Requires state update: "passed away" invalidates "has a cat".' },
      { question: 'How many pets does the user have?', expected: '1 — Max the dog.', why: 'Requires combining temporal reasoning with state tracking.' },
    ],
  },
  {
    id: 'preference',
    title: 'Preference Evolution',
    description: 'Preferences change over time. Which system tracks the current state?',
    conversations: [
      { session: 'Session 1', date: '2025-02-01', messages: [
        { role: 'user', content: 'I\'m vegetarian, have been for about 3 years now.' },
        { role: 'assistant', content: 'Great! I\'ll keep that in mind for any food recommendations.' },
      ]},
      { session: 'Session 2', date: '2025-07-15', messages: [
        { role: 'user', content: 'I\'ve actually started eating fish again. My doctor recommended it for the omega-3s. So I\'m pescatarian now.' },
        { role: 'assistant', content: 'That makes sense. Pescatarian gives you more options.' },
      ]},
    ],
    questions: [
      { question: 'What is the user\'s dietary preference?', expected: 'Pescatarian', why: 'Requires supersession of single-valued preference.' },
      { question: 'Can I recommend a sushi restaurant?', expected: 'Yes — the user eats fish now.', why: 'Requires applying the updated preference.' },
    ],
  },
];

// ── Types ──────────────────────────────────────────────────────────

interface SystemResult {
  system: string;
  answer: string;
  latency_ms: number;
}

interface SystemInfo {
  name: string;
  color: string;
  bg: string;
  border: string;
}

const SYSTEM_STYLES: Record<string, SystemInfo> = {
  MinnsDB: { name: 'MinnsDB', color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/30' },
  'Vector RAG': { name: 'Vector RAG', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' },
  mem0: { name: 'mem0', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
};

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

function ResultCard({ result, expected }: { result: SystemResult; expected: string }) {
  const info = SYSTEM_STYLES[result.system] || SYSTEM_STYLES['Vector RAG'];
  return (
    <div className={`rounded-lg border p-3 ${info.bg} ${info.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold ${info.color}`}>{result.system}</span>
        <span className="text-[10px] text-gray-500 font-mono">{result.latency_ms}ms</span>
      </div>
      <p className="text-sm text-gray-200 mb-1.5">{result.answer}</p>
      <p className="text-[11px] text-gray-600">Expected: {expected}</p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function ComparisonPage() {
  const [activeScenario, setActiveScenario] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [results, setResults] = useState<SystemResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scenario = SCENARIOS[activeScenario];
  const question = scenario.questions[activeQuestion];

  const handleScenarioChange = useCallback((idx: number) => {
    setActiveScenario(idx);
    setActiveQuestion(0);
    setResults(null);
    setError(null);
  }, []);

  const handleQuestionChange = useCallback((idx: number) => {
    setActiveQuestion(idx);
    setResults(null);
    setError(null);
  }, []);

  const runComparison = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch('/api/comparison/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, question: question.question }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setResults(data.results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [scenario, question]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-surface-4 px-6 py-4 bg-surface-0">
        <h1 className="text-lg font-semibold text-white mb-1">Live Memory System Comparison</h1>
        <p className="text-xs text-gray-500">Same conversations ingested into MinnsDB, mem0, and Vector RAG. Real queries. Real answers.</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Scenario + Conversation */}
        <div className="w-96 border-r border-surface-4 flex flex-col overflow-hidden">
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

          <div className="px-6 py-4 border-b border-surface-4">
            <div className="bg-surface-2 rounded-xl p-4">
              <p className="text-sm text-white font-medium mb-2">"{question.question}"</p>
              <p className="text-[11px] text-gray-500">{question.why}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!results && !loading && !error && (
              <div className="flex flex-col items-center justify-center h-full">
                <button
                  onClick={runComparison}
                  className="px-6 py-3 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
                >
                  Run live comparison
                </button>
                <p className="text-[10px] text-gray-600 mt-2">Ingests into all 3 systems and queries each one</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin mb-3" />
                <p className="text-xs text-gray-400">Running against MinnsDB, mem0, and Vector RAG...</p>
              </div>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4">
                <p className="text-sm text-rose-400">{error}</p>
                <button onClick={runComparison} className="mt-2 text-xs text-rose-300 underline">Retry</button>
              </div>
            )}

            {results && (
              <div className="flex flex-col gap-3 animate-fade-in-up">
                {results.map((r, i) => (
                  <ResultCard key={i} result={r} expected={question.expected} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
