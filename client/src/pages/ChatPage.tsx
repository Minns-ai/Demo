import { useState, useRef, useEffect, useCallback } from 'react';
import MessageInput from '../components/chat/MessageInput';
import { ingestConversations, queryNLQ, getClaims } from '../api/client';
import type { IngestResponse, NLQResponse } from '../api/client';

// ── Pre-loaded travel conversation ───────────────────────────────────

const CASE_ID = 'travel-booking-sarah-2024';

const preloadedConversation = [
  { role: 'user' as const, content: "Sarah: Hi, I'm looking to plan a holiday for my family. We're thinking about going to the Amalfi Coast in Italy." },
  { role: 'assistant' as const, content: "That sounds wonderful! The Amalfi Coast is beautiful. When are you thinking of traveling?" },
  { role: 'user' as const, content: "Sarah: We're flexible but probably late June or early July. We need to work around the kids' school holidays." },
  { role: 'assistant' as const, content: "Perfect timing — the weather is ideal then. How many people will be traveling?" },
  { role: 'user' as const, content: "Sarah: It'll be me, my husband Tom, and our two kids — Lily who's 8 and Max who's 5." },
  { role: 'assistant' as const, content: "Lovely! Do you have a budget in mind for the trip?" },
  { role: 'user' as const, content: "Sarah: We're thinking around €5,000 for the whole trip, flights included. We'd love to stay somewhere with a pool." },
  { role: 'assistant' as const, content: "That's very doable. I'd recommend Ravello — it's slightly quieter than Positano but equally stunning. There are some great family-friendly villas with pools." },
  { role: 'user' as const, content: "Sarah: Ravello sounds perfect! We also want to do a day trip to Pompeii — Tom is a history buff." },
  { role: 'assistant' as const, content: "Absolutely, Pompeii is an easy day trip from the Amalfi Coast. I can arrange a private guided tour which is much better with young children." },
  { role: 'user' as const, content: "Sarah: That would be great. Oh, and I should mention — Lily is allergic to nuts, so we need to be careful with restaurants." },
  { role: 'assistant' as const, content: "Noted, I'll make sure all restaurant recommendations are nut-allergy friendly. Many Italian restaurants are very accommodating." },
  { role: 'user' as const, content: "Sarah: One more thing — we'd love to take the ferry to Capri for a day if possible." },
  { role: 'assistant' as const, content: "Capri is gorgeous and very doable as a day trip. The ferry from Amalfi takes about an hour. I'd suggest going on a weekday to avoid the weekend crowds." },
  { role: 'user' as const, content: "Sarah: Oh and I forgot to say — I live in Manchester and Tom works for Deloitte so we'd need flights from Manchester Airport." },
  { role: 'assistant' as const, content: "Perfect, I'll look into direct flights from Manchester to Naples. From there it's about a 90-minute drive to the Amalfi Coast." },
];

const starterQueries = [
  { text: "What do I know about Sarah's family?", subtitle: 'entity_summary' },
  { text: "What's the budget for the trip?", subtitle: 'numeric' },
  { text: 'Are there any dietary requirements?', subtitle: 'preference' },
  { text: 'Where does Sarah live?', subtitle: 'state' },
  { text: 'What activities are planned?', subtitle: 'entity_summary' },
  { text: 'Summarize this trip', subtitle: 'nlq' },
];

// ── Types ────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  queryResult?: NLQResponse;
  queryTimeMs?: number;
  timestamp: number;
}

type Provider = 'openai' | 'anthropic';

// ── Query type colors ────────────────────────────────────────────────

const qtStyle: Record<string, { dot: string; label: string }> = {
  numeric: { dot: 'bg-blue-400', label: 'numeric' },
  state: { dot: 'bg-emerald-400', label: 'state' },
  entity_summary: { dot: 'bg-violet-400', label: 'entity' },
  preference: { dot: 'bg-amber-400', label: 'preference' },
  relationship: { dot: 'bg-rose-400', label: 'relationship' },
  nlq: { dot: 'bg-cyan-400', label: 'nlq' },
};

// ═════════════════════════════════════════════════════════════════════

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingested, setIngested] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<IngestResponse | null>(null);
  const [provider, setProvider] = useState<Provider>('openai');
  const [drawerMsg, setDrawerMsg] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // ── Auto-ingest on mount (skip if data already exists) ───────────
  const ingestOnce = useRef(false);
  useEffect(() => {
    if (ingestOnce.current) return;
    ingestOnce.current = true;

    (async () => {
      // Check if claims already exist — if so, data was previously ingested
      try {
        const existing = await getClaims(1);
        if (existing.length > 0) {
          setIngestResult({ messages_processed: preloadedConversation.length, transactions_found: 0, state_changes_found: 0, relationships_found: 0, chitchat_skipped: 0 });
          setIngested(true);
          return;
        }
      } catch {
        // Server might not be ready — continue to ingest
      }

      // No existing data — ingest the demo conversation
      setIngesting(true);
      try {
        const result = await ingestConversations({
          case_id: CASE_ID,
          sessions: [{
            session_id: 'travel-planning-01',
            topic: 'Amalfi Coast family holiday planning',
            messages: preloadedConversation,
          }],
        });
        setIngestResult(result);
        setIngested(true);
      } catch {
        setIngested(true);
      } finally {
        setIngesting(false);
      }
    })();
  }, []);

  // ── Query handler ─────────────────────────────────────────────────
  const handleSend = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setDrawerMsg(null);

    try {
      // Query MINNS via NLQ
      const t0 = Date.now();
      const result = await queryNLQ(text);
      const queryTimeMs = Date.now() - t0;

      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'agent',
        text: result.answer,
        queryResult: result,
        queryTimeMs,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, agentMsg]);
      setDrawerMsg(agentMsg);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`, role: 'agent',
        text: `Could not reach MINNS. Is the server running on port 3001?`,
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const showWelcome = messages.length === 0 && !loading && ingested;
  const hasDrawer = drawerMsg?.queryResult != null;

  return (
    <div className="flex h-full gap-3">
      {/* ── Main chat ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <Header
          ingested={ingested}
          ingesting={ingesting}
          ingestResult={ingestResult}
          provider={provider}
          setProvider={setProvider}
        />

        {/* Ingested conversation accordion */}
        {ingested && <HistoryAccordion />}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          {showWelcome && <WelcomeState onQuery={handleSend} />}

          {messages.map(m => (
            <MessageRow
              key={m.id}
              msg={m}
              isActive={drawerMsg?.id === m.id}
              onInspect={() => setDrawerMsg(m)}
            />
          ))}

          {loading && <TypingIndicator />}
        </div>

        <MessageInput onSend={handleSend} disabled={loading || !ingested} />
      </div>

      {/* ── Detail drawer (only visible when a message is inspected) ─ */}
      {hasDrawer && (
        <DetailDrawer msg={drawerMsg!} onClose={() => setDrawerMsg(null)} />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// Sub-components — each one small and focused
// ═════════════════════════════════════════════════════════════════════

// ── Header ───────────────────────────────────────────────────────────

function Header({ ingested, ingesting, ingestResult, provider, setProvider }: {
  ingested: boolean;
  ingesting: boolean;
  ingestResult: IngestResponse | null;
  provider: Provider;
  setProvider: (p: Provider) => void;
}) {
  return (
    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white">
          M
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-[1.5px] border-white" />
      </div>
      <div className="mr-auto">
        <h1 className="text-sm font-semibold text-gray-800 leading-tight">MINNS SDK</h1>
        <div className="flex items-center gap-1.5">
          {ingesting && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] text-blue-500 font-medium">Ingesting conversation...</span>
            </div>
          )}
          {ingested && ingestResult && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
              <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[10px] text-emerald-600 font-medium">
                {ingestResult.messages_processed} messages ingested
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Model toggle */}
      <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
        {(['openai', 'anthropic'] as const).map(p => (
          <button
            key={p}
            onClick={() => setProvider(p)}
            className={`text-[10px] font-medium px-2.5 py-1 rounded-md transition-all duration-150 capitalize ${
              provider === p
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {p === 'openai' ? 'OpenAI' : 'Claude'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── History accordion ────────────────────────────────────────────────

function HistoryAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 bg-gray-50/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-5 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="w-5 h-5 rounded-md bg-brand-50 flex items-center justify-center">
          <svg className="w-3 h-3 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
          </svg>
        </div>
        <span className="text-[11px] font-medium text-gray-600">Ingested via</span>
        <code className="text-[10px] font-mono text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">ingestConversations()</code>
        <span className="text-[10px] text-gray-400">{preloadedConversation.length} messages</span>
        <svg className={`w-3 h-3 text-gray-300 ml-auto transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-3 max-h-60 overflow-y-auto">
          <div className="space-y-1.5 py-1">
            {preloadedConversation.map((msg, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[7px] font-bold flex-shrink-0 mt-px ${
                  msg.role === 'user' ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-100 text-gray-400'
                }`}>
                  {msg.role === 'user' ? 'S' : 'A'}
                </div>
                <p className={`text-[11px] leading-relaxed ${msg.role === 'user' ? 'text-gray-600' : 'text-gray-400'}`}>
                  {msg.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Welcome state ────────────────────────────────────────────────────

function WelcomeState({ onQuery }: { onQuery: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/20 mb-4">
        <span className="text-lg font-bold text-white">M</span>
      </div>
      <h2 className="text-base font-semibold text-gray-800 mb-1">Conversation loaded</h2>
      <p className="text-[13px] text-gray-400 max-w-sm mb-8 leading-relaxed">
        A travel booking conversation has been ingested into MINNS.<br />
        Ask a question to query the structured memory.
      </p>

      <div className="w-full max-w-md">
        <div className="grid grid-cols-2 gap-2">
          {starterQueries.map(q => {
            const s = qtStyle[q.subtitle] ?? qtStyle.nlq;
            return (
              <button
                key={q.text}
                onClick={() => onQuery(q.text)}
                className="group flex items-center gap-2.5 px-3.5 py-3 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl text-left transition-all duration-150"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
                <span className="text-[12px] text-gray-600 group-hover:text-gray-800 leading-snug">{q.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Message row ──────────────────────────────────────────────────────

function MessageRow({ msg, isActive, onInspect }: {
  msg: ChatMessage;
  isActive: boolean;
  onInspect: () => void;
}) {
  const isUser = msg.role === 'user';
  const hasResult = !!msg.queryResult;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in-up`}>
      {/* Agent avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mr-2.5 mt-0.5">
          M
        </div>
      )}

      <div className={`max-w-[72%] ${isActive && hasResult ? 'ring-2 ring-brand-200 ring-offset-1 rounded-2xl' : ''}`}>
        {/* Bubble */}
        <div className={`px-4 py-2.5 text-[13px] leading-[1.65] ${
          isUser
            ? 'bg-gray-900 text-white rounded-2xl rounded-br-md'
            : 'bg-gray-50 text-gray-700 rounded-2xl rounded-bl-md border border-gray-100'
        }`}>
          {msg.text.split('\n').map((line, i) => (
            <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
              {line.split(/(\*\*.*?\*\*)/g).map((part, j) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
                  : part
              )}
            </p>
          ))}
        </div>

        {/* SDK metadata pill — clickable to open drawer */}
        {!isUser && hasResult && (
          <button
            onClick={onInspect}
            className="mt-1 inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full bg-gray-100/80 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all duration-150 group"
          >
            {(() => {
              const s = qtStyle[msg.queryResult!.intent] ?? qtStyle.nlq;
              return <div className={`w-[5px] h-[5px] rounded-full ${s.dot}`} />;
            })()}
            <span className="text-[9px] text-gray-400 group-hover:text-gray-600 font-medium uppercase tracking-wide">
              {(qtStyle[msg.queryResult!.intent] ?? qtStyle.nlq).label}
            </span>
            <span className="text-[9px] text-gray-300 font-mono">{msg.queryTimeMs}ms</span>
            {(msg.queryResult!.entities_resolved?.length ?? 0) > 0 && (
              <span className="text-[9px] text-violet-400">{msg.queryResult!.entities_resolved.length} entities</span>
            )}
            <svg className="w-2.5 h-2.5 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0 ml-2.5 mt-0.5">
          U
        </div>
      )}
    </div>
  );
}

// ── Typing indicator ─────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mr-2.5 mt-0.5">
        M
      </div>
      <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-[3px]">
            <span className="w-[5px] h-[5px] rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-[5px] h-[5px] rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-[5px] h-[5px] rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[11px] text-gray-400 ml-1">Querying MINNS</span>
        </div>
      </div>
    </div>
  );
}

// ── Detail drawer ────────────────────────────────────────────────────
// Slides in from the right when user clicks a metadata pill.
// Shows the full SDK response: query type, structured memory, code.

function DetailDrawer({ msg, onClose }: { msg: ChatMessage; onClose: () => void }) {
  const r = msg.queryResult!;
  const qt = qtStyle[r.intent] ?? qtStyle.nlq;
  const [tab, setTab] = useState<'request' | 'response'>('response');

  return (
    <div className="w-[360px] flex-shrink-0 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col animate-fade-in-up">
      {/* Drawer header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${qt.dot}`} />
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            POST /nlq
          </span>
          <span className="text-[10px] font-mono text-emerald-500 ml-auto">{msg.queryTimeMs}ms</span>
          <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors ml-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Tab toggle */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['request', 'response'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-[10px] font-medium py-1 rounded-md transition-all duration-150 capitalize ${
                tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'request' ? (
          <RequestTab question={msg.text} />
        ) : (
          <ResponseTab result={r} qt={qt} />
        )}
      </div>
    </div>
  );
}

function RequestTab({ question }: { question: string }) {
  return (
    <div className="p-4 space-y-4">
      {/* SDK method */}
      <div>
        <div className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mb-2">SDK Method</div>
        <div className="bg-gray-900 rounded-lg p-3">
          <pre className="text-[11px] font-mono leading-relaxed">
            <span className="text-gray-500">await </span>
            <span className="text-blue-300">client</span>
            <span className="text-gray-400">.</span>
            <span className="text-yellow-300">nlq</span>
            <span className="text-gray-400">{'({'}</span>
            {'\n'}
            <span className="text-gray-500">  question: </span>
            <span className="text-emerald-300">"{question.length > 40 ? question.slice(0, 40) + '...' : question}"</span>
            {'\n'}
            <span className="text-gray-400">{'});'}</span>
          </pre>
        </div>
      </div>

      {/* HTTP request */}
      <div>
        <div className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mb-2">HTTP Request</div>
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">POST</span>
            <span className="text-[10px] font-mono text-gray-500">/nlq</span>
          </div>
          <pre className="text-[10px] font-mono text-gray-600 leading-relaxed whitespace-pre-wrap">
{JSON.stringify({ question }, null, 2)}
          </pre>
        </div>
      </div>

      {/* What happens */}
      <div>
        <div className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mb-2">What MINNS does</div>
        <div className="space-y-1.5">
          {[
            'Classifies intent (FindNeighbors, FilteredTraversal, Aggregate, etc.)',
            'Resolves entity mentions against the knowledge graph',
            'Builds and executes a graph query',
            'Returns human-readable answer with step-by-step explanation',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-400 flex-shrink-0 mt-px">
                {i + 1}
              </div>
              <span className="text-[11px] text-gray-500 leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResponseTab({ result, qt }: { result: NLQResponse; qt: { dot: string; label: string } }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="divide-y divide-gray-50">
      {/* Intent */}
      <div className="px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] text-gray-400 font-mono">intent</span>
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100">
            <div className={`w-1.5 h-1.5 rounded-full ${qt.dot}`} />
            <span className="text-[10px] font-mono font-medium text-gray-700">{result.intent}</span>
          </div>
          <span className="text-[9px] font-mono text-gray-400 ml-auto">
            confidence: {(result.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Answer */}
      <div className="px-4 py-3">
        <div className="text-[10px] text-gray-400 font-mono mb-1">answer</div>
        <p className="text-[12px] text-gray-700 leading-relaxed">{result.answer}</p>
      </div>

      {/* Entities resolved */}
      {(result.entities_resolved?.length ?? 0) > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] text-gray-400 font-mono">entities_resolved</span>
            <span className="text-[9px] font-mono text-violet-400 ml-auto">[{result.entities_resolved.length}]</span>
          </div>
          <div className="space-y-1">
            {result.entities_resolved.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-700 font-medium">{e.text}</span>
                <span className="text-[9px] text-gray-400 font-mono">{e.node_type}</span>
                <span className="text-[9px] text-emerald-500 ml-auto">{(e.confidence * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      {(result.explanation?.length ?? 0) > 0 && (
        <div className="px-4 py-3">
          <div className="text-[10px] text-gray-400 font-mono mb-2">explanation</div>
          <div className="space-y-1">
            {result.explanation.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-400 flex-shrink-0 mt-px">
                  {i + 1}
                </div>
                <span className="text-[11px] text-gray-500 leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono">
          <span>results: {result.result_count}</span>
          <span>total: {result.total_count}</span>
          <span>{result.execution_time_ms}ms</span>
        </div>
      </div>

      {/* Raw JSON toggle */}
      <div className="px-4 py-3">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-[10px] text-brand-500 hover:text-brand-600 font-medium transition-colors"
        >
          {showRaw ? 'Hide' : 'Show'} full JSON response
        </button>
        {showRaw && (
          <pre className="mt-2 text-[9px] font-mono text-gray-500 bg-gray-50 rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap border border-gray-100">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
