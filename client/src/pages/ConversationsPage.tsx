import { useState, useRef, useEffect } from 'react';
import {
  ingestConversations,
  queryConversations,
  type IngestRequest,
  type IngestResponse,
  type QueryResponse,
  type ConversationSession,
} from '../api/client';

// ── Sample Datasets ─────────────────────────────────────────────────

const lisbonTrip: { label: string; description: string; case_id: string; sessions: ConversationSession[] } = {
  label: 'Lisbon Group Trip',
  description: '4 friends splitting meals, museum tickets, transport & Airbnb over 3 days in Lisbon.',
  case_id: 'lisbon_trip_2024',
  sessions: [
    {
      session_id: 'lisbon_day1',
      topic: 'Day 1 — Arrival & Dinner',
      messages: [
        { role: 'user', content: 'Alice: Paid €85 for Airbnb first night — split 4 ways with Bob, Carol, and Dave.' },
        { role: 'user', content: 'Bob: Grabbed lunch for everyone at Time Out Market, came to €62. Split equally.' },
        { role: 'user', content: 'Carol: I prefer vegetarian restaurants, keep that in mind for tomorrow.' },
        { role: 'user', content: 'Dave: Covered the taxi from the airport — €28, split between me and Alice.' },
      ],
    },
    {
      session_id: 'lisbon_day2',
      topic: 'Day 2 — Museums & Pastéis',
      messages: [
        { role: 'user', content: 'Alice: Paid €179 for group museum pass at Belém — split with Bob, Carol, and Dave.' },
        { role: 'user', content: 'Bob: Bought pastéis de nata for the group — €12. My treat, no split needed.' },
        { role: 'user', content: 'Carol: Paid €45 for a vegetarian dinner at a place near Alfama — split with Alice.' },
        { role: 'user', content: 'Dave: Got us tram tickets for the day, €36 total — split 4 ways.' },
      ],
    },
    {
      session_id: 'lisbon_day3',
      topic: 'Day 3 — Sintra & Departure',
      messages: [
        { role: 'user', content: 'Alice: Rented a car for Sintra day trip, €95. Split between all four.' },
        { role: 'user', content: 'Bob: Paid €107 for group dinner — split among Alice, Carol, Dave, and me.' },
        { role: 'user', content: 'The weather in Sintra was absolutely gorgeous today!' },
        { role: 'user', content: 'Dave: Alice and I are planning another trip to Porto next month.' },
      ],
    },
  ],
};

const teamBudget: { label: string; description: string; case_id: string; sessions: ConversationSession[] } = {
  label: 'Team Project Budget',
  description: 'Engineering, Design & Marketing tracking shared infra, vendor payments, and licenses.',
  case_id: 'team_budget_q1',
  sessions: [
    {
      session_id: 'budget_infra',
      topic: 'Shared Infrastructure Costs',
      messages: [
        { role: 'user', content: 'Engineering: Paid $2,400 for AWS hosting — split 3 ways with Design and Marketing.' },
        { role: 'user', content: 'Design: Covered $180 for Figma team licenses — charged to Design only.' },
        { role: 'user', content: 'Marketing: Paid $650 for analytics platform — split with Engineering.' },
      ],
    },
    {
      session_id: 'budget_vendors',
      topic: 'Vendor Payments & Licenses',
      messages: [
        { role: 'user', content: 'Engineering: Vendor payment to CloudCorp — $1,200. Split equally across all teams.' },
        { role: 'user', content: 'Marketing: Our team prefers monthly billing over annual for vendor contracts.' },
        { role: 'user', content: 'Design: Paid $320 for stock photo subscription — split with Marketing.' },
        { role: 'user', content: 'Engineering: GitHub Enterprise license — $540, Engineering only.' },
        { role: 'user', content: 'Engineering works closely with Design on the frontend components.' },
      ],
    },
  ],
};

const datasets = [lisbonTrip, teamBudget];

// ── Query Chips ─────────────────────────────────────────────────────

const starterChips = [
  'Who owes whom?',
  'What is the total spending?',
  'Balance between Alice and Bob?',
  'Summarize all transactions',
  'Who spent the most?',
  'What preferences were mentioned?',
];

// ── Query Type Badge Colors ─────────────────────────────────────────

const queryTypeBadge: Record<string, string> = {
  numeric: 'bg-blue-100 text-blue-700',
  state: 'bg-amber-100 text-amber-700',
  entity_summary: 'bg-purple-100 text-purple-700',
  preference: 'bg-pink-100 text-pink-700',
  relationship: 'bg-emerald-100 text-emerald-700',
  nlq: 'bg-gray-100 text-gray-600',
};

// ── Stat Badge Colors ───────────────────────────────────────────────

const statColors: Record<string, string> = {
  messages_processed: 'text-blue-600 bg-blue-50',
  transactions_found: 'text-emerald-600 bg-emerald-50',
  state_changes_found: 'text-amber-600 bg-amber-50',
  relationships_found: 'text-purple-600 bg-purple-50',
  chitchat_skipped: 'text-gray-500 bg-gray-50',
};

const statLabels: Record<string, string> = {
  messages_processed: 'Messages',
  transactions_found: 'Transactions',
  state_changes_found: 'State Changes',
  relationships_found: 'Relationships',
  chitchat_skipped: 'Chitchat Skipped',
};

// ── Types ───────────────────────────────────────────────────────────

interface QAPair {
  id: string;
  question: string;
  response: QueryResponse;
}

// ── Component ───────────────────────────────────────────────────────

export default function ConversationsPage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<IngestResponse | null>(null);
  const [qaHistory, setQaHistory] = useState<QAPair[]>([]);
  const [queryInput, setQueryInput] = useState('');
  const [querying, setQuerying] = useState(false);
  const [selectedQA, setSelectedQA] = useState<QAPair | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const dataset = datasets[selectedIdx];
  const ingested = ingestResult !== null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qaHistory]);

  function resetState() {
    setIngestResult(null);
    setQaHistory([]);
    setSelectedQA(null);
    setError(null);
  }

  async function handleIngest() {
    setIngesting(true);
    setError(null);
    try {
      const req: IngestRequest = {
        case_id: dataset.case_id,
        sessions: dataset.sessions,
        include_assistant_facts: false,
      };
      const result = await ingestConversations(req);
      setIngestResult(result);
      setQaHistory([]);
      setSelectedQA(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIngesting(false);
    }
  }

  async function handleQuery(question: string) {
    if (!question.trim()) return;
    setQuerying(true);
    setError(null);
    setQueryInput('');
    try {
      const response = await queryConversations(question);
      const pair: QAPair = { id: `qa-${Date.now()}`, question, response };
      setQaHistory(prev => [...prev, pair]);
      setSelectedQA(pair);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuerying(false);
    }
  }

  return (
    <div className="flex h-full gap-3">
      {/* ── Left Panel: Dataset & Ingestion ─────────────────────────── */}
      <div className="w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Datasets</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Select a dataset and ingest into memory</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {datasets.map((ds, idx) => (
            <button
              key={ds.case_id}
              onClick={() => { setSelectedIdx(idx); resetState(); }}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                idx === selectedIdx
                  ? 'border-brand-300 bg-brand-50/50 ring-1 ring-brand-200'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className={`w-4 h-4 ${idx === selectedIdx ? 'text-brand-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <span className="text-xs font-semibold text-gray-800">{ds.label}</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">{ds.description}</p>
              <div className="mt-2 flex gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                  {ds.sessions.length} sessions
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                  {ds.sessions.reduce((n, s) => n + s.messages.length, 0)} messages
                </span>
              </div>
            </button>
          ))}

          {/* Ingest Button */}
          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="w-full mt-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white text-xs font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {ingesting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Ingesting...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Ingest Dataset
              </>
            )}
          </button>

          {/* Ingest Stats */}
          {ingestResult && (
            <div className="mt-2 p-3 rounded-xl border border-gray-200 bg-gray-50/50 animate-fade-in-up">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-2">Ingestion Results</p>
              <div className="space-y-1.5">
                {Object.entries(ingestResult).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-600">{statLabels[key] ?? key}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statColors[key] ?? 'text-gray-600 bg-gray-100'}`}>
                      {val as number}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-2 p-3 rounded-xl border border-red-200 bg-red-50 text-[11px] text-red-600">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ── Center Panel: Query Interface ────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            Q
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-800">Conversation Query</h1>
            <p className="text-[11px] text-gray-400">Ask questions about ingested conversation data</p>
          </div>
          {ingested && (
            <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 font-semibold border border-emerald-200">
              Data Ready
            </span>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!ingested && qaHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Query Conversations</h2>
              <p className="text-sm text-gray-400 max-w-sm">
                Select a dataset and click "Ingest" to load conversations into memory, then ask questions here.
              </p>
            </div>
          )}

          {ingested && qaHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center mb-5 shadow-lg shadow-brand-500/15">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Data Ingested</h2>
              <p className="text-sm text-gray-400 max-w-sm mb-6">
                Try one of the queries below or type your own question.
              </p>
              <div className="w-full max-w-md">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2.5 font-medium">Try asking</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {starterChips.map(chip => (
                    <button
                      key={chip}
                      onClick={() => handleQuery(chip)}
                      disabled={querying}
                      className="px-3 py-1.5 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-200 rounded-full text-[11px] text-gray-600 hover:text-brand-600 transition-all duration-200"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Q&A History */}
          {qaHistory.map(qa => (
            <div key={qa.id} className="mb-4">
              {/* User question */}
              <div className="flex justify-end mb-2">
                <div className="bg-brand-500 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-md text-sm">
                  {qa.question}
                </div>
              </div>
              {/* Answer */}
              <div className="flex justify-start">
                <button
                  onClick={() => setSelectedQA(qa)}
                  className={`text-left bg-white border px-4 py-3 rounded-2xl rounded-bl-md max-w-lg shadow-sm transition-all duration-200 hover:shadow-md ${
                    selectedQA?.id === qa.id ? 'border-brand-300 ring-1 ring-brand-200' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${queryTypeBadge[qa.response.query_type] ?? queryTypeBadge.nlq}`}>
                      {qa.response.query_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{qa.response.answer}</p>
                  <p className="text-[10px] text-gray-400 mt-2">Click to inspect details →</p>
                </button>
              </div>
            </div>
          ))}

          {querying && (
            <div className="flex justify-start mb-3">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] text-gray-400">Querying...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100">
          <form
            onSubmit={e => { e.preventDefault(); handleQuery(queryInput); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={queryInput}
              onChange={e => setQueryInput(e.target.value)}
              placeholder={ingested ? 'Ask a question about the conversation data...' : 'Ingest a dataset first...'}
              disabled={!ingested || querying}
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!ingested || querying || !queryInput.trim()}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* ── Right Panel: Result Inspector ────────────────────────────── */}
      <div className="w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Result Inspector</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Click a query result to inspect details</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {!selectedQA ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <svg className="w-10 h-10 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-xs">No result selected</p>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in-up">
              {/* Query Type */}
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">Query Type</p>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${queryTypeBadge[selectedQA.response.query_type] ?? queryTypeBadge.nlq}`}>
                  {selectedQA.response.query_type}
                </span>
              </div>

              {/* Answer */}
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">Answer</p>
                <p className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                  {selectedQA.response.answer}
                </p>
              </div>

              {/* Memory Context */}
              <CollapsibleSection title="Memory Context" defaultOpen>
                <pre className="text-[10px] text-gray-600 bg-gray-50 rounded-lg p-2.5 border border-gray-100 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {JSON.stringify(selectedQA.response.memory_context, null, 2)}
                </pre>
              </CollapsibleSection>

              {/* Related Memories */}
              <CollapsibleSection title={`Related Memories (${selectedQA.response.related_memories?.length ?? 0})`}>
                {selectedQA.response.related_memories?.length ? (
                  <div className="space-y-1.5">
                    {selectedQA.response.related_memories.map((mem: any, i: number) => (
                      <div key={i} className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-100">
                        {typeof mem === 'string' ? mem : (mem.summary || mem.takeaway || JSON.stringify(mem))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">No related memories</p>
                )}
              </CollapsibleSection>

              {/* Related Strategies */}
              <CollapsibleSection title={`Related Strategies (${selectedQA.response.related_strategies?.length ?? 0})`}>
                {selectedQA.response.related_strategies?.length ? (
                  <div className="space-y-1.5">
                    {selectedQA.response.related_strategies.map((strat: any, i: number) => (
                      <div key={i} className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-100">
                        {typeof strat === 'string' ? strat : (strat.name || strat.summary || JSON.stringify(strat))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">No related strategies</p>
                )}
              </CollapsibleSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Collapsible Section ─────────────────────────────────────────────

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1 hover:text-gray-600 transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {title}
      </button>
      {open && children}
    </div>
  );
}
