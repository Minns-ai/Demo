import LearnMoreBanner from '../components/shared/LearnMoreBanner';
import CodeBlock from '../components/shared/CodeBlock';

// ── Simplified architecture: 3 core endpoints ────────────────────────

interface EndpointCard {
  step: number;
  title: string;
  subtitle: string;
  method: string;
  endpoint: string;
  sdkMethod: string;
  description: string;
  code: string;
  color: string;
  borderColor: string;
  iconPath: string;
}

const endpoints: EndpointCard[] = [
  {
    step: 1,
    title: 'Ingest',
    subtitle: 'Feed conversations into MINNS',
    method: 'POST',
    endpoint: '/conversations/ingest',
    sdkMethod: 'client.ingestConversations()',
    description: 'Send multi-turn conversations in. MINNS automatically classifies each message (transaction, state change, relationship, preference, or chitchat) and builds structured memory. No events, no episodes — data goes directly into queryable memory.',
    code: `await client.ingestConversations({
  case_id: "trip_expenses_2024",
  sessions: [{
    session_id: "session_01",
    topic: "Holiday planning",
    messages: [
      { role: "user", content: "Sarah: Budget is €5,000" },
      { role: "user", content: "Sarah: Lily has a nut allergy" },
      { role: "user", content: "The weather was lovely!" },
    ],
  }],
});
// => { messages_processed: 3, chitchat_skipped: 1, ... }`,
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-l-blue-400',
    iconPath: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
  },
  {
    step: 2,
    title: 'Query',
    subtitle: 'Ask questions in plain English',
    method: 'POST',
    endpoint: '/nlq',
    sdkMethod: 'client.query()',
    description: 'Ask natural language questions against the knowledge graph. MINNS classifies intent, resolves entities, builds a graph query, and returns a human-readable answer with confidence scores and step-by-step explanation.',
    code: `const res = await client.query("What do you know about this user?");

// res.answer            => "Sarah lives in Manchester..."
// res.intent            => "entity_summary"
// res.entities_resolved => [{ text: "Sarah", confidence: 0.97 }]
// res.confidence        => 0.94`,
    color: 'from-violet-500 to-purple-500',
    borderColor: 'border-l-violet-400',
    iconPath: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    step: 3,
    title: 'Search',
    subtitle: 'Semantic search across extracted facts',
    method: 'POST',
    endpoint: '/claims/search',
    sdkMethod: 'client.searchClaims()',
    description: 'Search across all extracted claims using vector embeddings. Claims are atomic facts automatically extracted from events via the NER pipeline. Supports keyword (BM25), semantic (embedding), or hybrid search modes.',
    code: `const results = await client.searchClaims({
  queryText: "dietary requirements",
  topK: 5,
  minSimilarity: 0.7,
});

// results => [{ claim_text: "Lily is allergic to nuts",
//               confidence: 0.95, similarity: 0.89 }]`,
    color: 'from-amber-500 to-orange-500',
    borderColor: 'border-l-amber-400',
    iconPath: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
];

function EndpointSection({ card }: { card: EndpointCard }) {
  return (
    <div className={`bg-white rounded-2xl border-l-4 ${card.borderColor} overflow-hidden shadow-sm`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <span className="text-white text-sm font-bold">{card.step}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-800">{card.title}</h3>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 text-brand-600">
                {card.method}
              </span>
              <span className="text-[10px] font-mono text-gray-400">{card.endpoint}</span>
            </div>
            <p className="text-xs text-gray-500">{card.subtitle}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-[12px] text-gray-500 leading-relaxed mb-4">
          {card.description}
        </p>

        {/* SDK method badge */}
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={card.iconPath} />
          </svg>
          <code className="text-[11px] font-mono text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
            {card.sdkMethod}
          </code>
        </div>

        {/* Code example */}
        <CodeBlock code={card.code} />
      </div>
    </div>
  );
}

export default function ArchitecturePage() {
  return (
    <div className="h-full overflow-y-auto bg-white rounded-2xl shadow-sm">
      <div className="max-w-3xl mx-auto p-6">
        <LearnMoreBanner
          light
          title="Get Started in 3 API Calls"
          description="MINNS turns conversations into queryable structured memory. Ingest conversations, ask questions, search facts. That's it."
          sdkMethods={[
            { method: 'ingestConversations()', endpoint: 'POST /conversations/ingest', description: 'Feed multi-turn conversations into structured memory' },
            { method: 'query()', endpoint: 'POST /nlq', description: 'Ask natural language questions against the knowledge graph' },
            { method: 'searchClaims()', endpoint: 'POST /claims/search', description: 'Semantic vector search across extracted facts' },
          ]}
        />

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 mb-4">
            <span className="text-[10px] text-brand-600 font-mono font-semibold">npm install minns-sdk</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Three endpoints. That's it.</h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Ingest conversations, query what you know, search extracted facts.
            MINNS handles classification, structured memory, and semantic search automatically.
          </p>
        </div>

        {/* Quick start code */}
        <div className="bg-gray-900 rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-2 text-[10px] text-gray-500 font-mono">quickstart.ts</span>
          </div>
          <CodeBlock className="!p-0 !bg-transparent !rounded-none text-[12px]" code={`import { MinnsClient } from 'minns-sdk';

const client = new MinnsClient({ apiKey: "your-api-key" });

// 1. Ingest a conversation
await client.ingestConversations({
  case_id: "holiday-planning",
  sessions: [{ session_id: "s1", topic: "trip", messages }],
});

// 2. Query with natural language
const answer = await client.query("What's the budget?");

// 3. Search extracted facts
const claims = await client.searchClaims({ queryText: "allergies" });`} />
        </div>

        {/* Flow arrows + endpoint cards */}
        <div className="space-y-4">
          {endpoints.map((card, i) => (
            <div key={card.step}>
              <EndpointSection card={card} />
              {i < endpoints.length - 1 && (
                <div className="flex justify-center py-2">
                  <svg width="24" height="28" viewBox="0 0 24 28" className="text-gray-300">
                    <line x1="12" y1="0" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3">
                      <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.5s" repeatCount="indefinite" />
                    </line>
                    <path d="M7 17 L12 25 L17 17" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Under the hood */}
        <div className="mt-10 rounded-2xl bg-gray-50 border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Under the Hood</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <div className="text-[10px] text-brand-600 font-semibold uppercase tracking-wider mb-1">Classification</div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Messages are auto-classified into transactions, state changes, relationships, preferences, or chitchat
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <div className="text-[10px] text-brand-600 font-semibold uppercase tracking-wider mb-1">Structured Memory</div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Data flows into typed templates — ledgers, state machines, preference lists, and entity graphs
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <div className="text-[10px] text-brand-600 font-semibold uppercase tracking-wider mb-1">Semantic Search</div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Claims are extracted via NER and indexed with vector embeddings for similarity search
              </p>
            </div>
          </div>
        </div>

        {/* Footer legend */}
        <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="font-mono px-1 py-0.5 bg-brand-50 rounded text-brand-600 text-[8px]">method()</span>
            <span>SDK method</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-gray-100 text-blue-600">POST</span>
            <span>API endpoint</span>
          </div>
        </div>
      </div>
    </div>
  );
}
