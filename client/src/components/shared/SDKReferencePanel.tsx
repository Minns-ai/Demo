import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface SDKMethod {
  name: string;
  endpoint: string;
  description: string;
  page: string;
}

interface MethodGroup {
  category: string;
  methods: SDKMethod[];
}

const methodGroups: MethodGroup[] = [
  {
    category: 'Health & Stats',
    methods: [
      { name: 'healthCheck()', endpoint: 'GET /health', description: 'Server health, uptime, and graph size', page: '/dashboard' },
      { name: 'getStats()', endpoint: 'GET /stats', description: 'Processing stats and store metrics', page: '/dashboard' },
    ],
  },
  {
    category: 'Events',
    methods: [
      { name: 'processEvent()', endpoint: 'POST /events', description: 'Process a raw semantic event', page: '/chat' },
      { name: 'sendSimpleEvent()', endpoint: 'POST /events', description: 'Send a simple text event', page: '/chat' },
      { name: 'sendStateChangeEvent()', endpoint: 'POST /events', description: 'Send a state change event', page: '/chat' },
      { name: 'sendTransactionEvent()', endpoint: 'POST /events', description: 'Send a transaction event', page: '/chat' },
      { name: 'getEvents()', endpoint: 'GET /events', description: 'List recent processed events', page: '/chat' },
    ],
  },
  {
    category: 'Memory',
    methods: [
      { name: 'getAgentMemories()', endpoint: 'GET /memories/:agentId', description: 'Retrieve all memories for an agent', page: '/memories' },
      { name: 'getContextMemories()', endpoint: 'POST /memories/context', description: 'Get memories relevant to a context', page: '/memories' },
      { name: 'recallContext()', endpoint: 'POST /memories/recall', description: 'Recall memories by semantic similarity', page: '/memories' },
    ],
  },
  {
    category: 'Strategy',
    methods: [
      { name: 'getAgentStrategies()', endpoint: 'GET /strategies/:agentId', description: 'Retrieve learned playbooks', page: '/strategies' },
      { name: 'getSimilarStrategies()', endpoint: 'POST /strategies/similar', description: 'Find strategies for a situation', page: '/strategies' },
      { name: 'getActionSuggestions()', endpoint: 'POST /strategies/suggest', description: 'Get suggested next actions', page: '/strategies' },
    ],
  },
  {
    category: 'Claims',
    methods: [
      { name: 'getClaims()', endpoint: 'GET /claims', description: 'List extracted factual claims', page: '/claims' },
      { name: 'getClaimById()', endpoint: 'GET /claims/:id', description: 'Get a single claim by ID', page: '/claims' },
      { name: 'searchClaims()', endpoint: 'POST /claims/search', description: 'Semantic search over claims', page: '/claims' },
      { name: 'processEmbeddings()', endpoint: 'POST /admin/embeddings', description: 'Trigger embedding indexing', page: '/claims' },
    ],
  },
  {
    category: 'Graph & Analytics',
    methods: [
      { name: 'getGraph()', endpoint: 'GET /graph', description: 'Get the full knowledge graph', page: '/graph' },
      { name: 'getAnalytics()', endpoint: 'GET /analytics', description: 'Graph analytics and metrics', page: '/graph' },
      { name: 'traverseGraph()', endpoint: 'GET /graph/traverse', description: 'Traverse from a start node', page: '/graph' },
      { name: 'getCommunities()', endpoint: 'GET /graph/communities', description: 'Community detection results', page: '/graph' },
      { name: 'getCentrality()', endpoint: 'GET /graph/centrality', description: 'Node centrality rankings', page: '/graph' },
      { name: 'getPersonalizedPageRank()', endpoint: 'GET /graph/pagerank', description: 'Personalized PageRank scores', page: '/graph' },
      { name: 'getShortestPath()', endpoint: 'GET /graph/path', description: 'Shortest path between nodes', page: '/graph' },
      { name: 'getNeighborhood()', endpoint: 'GET /graph/neighborhood', description: 'Local neighborhood of a node', page: '/graph' },
      { name: 'getSubgraph()', endpoint: 'GET /graph/subgraph', description: 'Extract a subgraph by filter', page: '/graph' },
    ],
  },
  {
    category: 'NLQ',
    methods: [
      { name: 'nlq()', endpoint: 'POST /nlq', description: 'Natural language query over the graph', page: '/nlq' },
    ],
  },
  {
    category: 'Conversations',
    methods: [
      { name: 'ingestConversations()', endpoint: 'POST /conversations/ingest', description: 'Ingest conversation sessions', page: '/conversations' },
      { name: 'queryConversations()', endpoint: 'POST /conversations/query', description: 'Query ingested conversations', page: '/conversations' },
    ],
  },
  {
    category: 'Structured Memory',
    methods: [
      { name: 'upsertStructuredMemory()', endpoint: 'POST /structured-memory', description: 'Create or update a typed memory', page: '/structured-memory' },
      { name: 'getStructuredMemory()', endpoint: 'GET /structured-memory/:key', description: 'Retrieve a structured memory by key', page: '/structured-memory' },
      { name: 'listStructuredMemory()', endpoint: 'GET /structured-memory', description: 'List all structured memory keys', page: '/structured-memory' },
      { name: 'transitionState()', endpoint: 'POST /structured-memory/:key/state', description: 'Transition a state machine', page: '/structured-memory' },
      { name: 'appendLedgerEntry()', endpoint: 'POST /structured-memory/:key/ledger', description: 'Append a ledger entry', page: '/structured-memory' },
      { name: 'updatePreference()', endpoint: 'POST /structured-memory/:key/preference', description: 'Update preference ranking', page: '/structured-memory' },
      { name: 'addTreeChild()', endpoint: 'POST /structured-memory/:key/tree', description: 'Add a child node to a tree', page: '/structured-memory' },
    ],
  },
  {
    category: 'Planning',
    methods: [
      { name: 'plan()', endpoint: 'POST /planning/plan', description: 'Generate a high-level plan', page: '/chat' },
      { name: 'createPlan()', endpoint: 'POST /planning/create', description: 'Create a structured plan', page: '/chat' },
      { name: 'generateStrategies()', endpoint: 'POST /planning/strategies', description: 'Generate strategies from a plan', page: '/strategies' },
      { name: 'generateActions()', endpoint: 'POST /planning/actions', description: 'Generate concrete actions', page: '/chat' },
      { name: 'startExecution()', endpoint: 'POST /planning/execute', description: 'Start executing a plan', page: '/chat' },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SDKReferencePanel({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return methodGroups;
    const q = search.toLowerCase();
    return methodGroups
      .map(g => ({
        ...g,
        methods: g.methods.filter(
          m => m.name.toLowerCase().includes(q) || m.endpoint.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.methods.length > 0);
  }, [search]);

  const totalMethods = methodGroups.reduce((acc, g) => acc + g.methods.length, 0);

  function toggleGroup(cat: string) {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));
  }

  function handleMethodClick(page: string) {
    navigate(page);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 left-16 bottom-0 z-50 w-80 bg-surface-1 border-r border-surface-4 shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-surface-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">SDK Reference</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">{totalMethods} methods</span>
              <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-surface-3 text-gray-400 hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <input
            type="text"
            placeholder="Search methods..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-3 border border-surface-4 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Methods list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(group => (
            <div key={group.category}>
              <button
                onClick={() => toggleGroup(group.category)}
                className="w-full flex items-center justify-between px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-gray-500 hover:text-gray-300 hover:bg-surface-2 transition-colors"
              >
                <span>{group.category} ({group.methods.length})</span>
                <svg className={`w-3 h-3 transition-transform ${collapsed[group.category] ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!collapsed[group.category] && (
                <div className="pb-1">
                  {group.methods.map(m => (
                    <button
                      key={m.name}
                      onClick={() => handleMethodClick(m.page)}
                      className="w-full text-left px-4 py-2 hover:bg-surface-2 transition-colors group"
                    >
                      <div className="text-xs font-mono text-brand-300 group-hover:text-brand-200">{m.name}</div>
                      <div className="text-[10px] font-mono text-gray-600 mt-0.5">{m.endpoint}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{m.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-4 text-center text-xs text-gray-500">No methods match "{search}"</div>
          )}
        </div>
      </div>
    </>
  );
}
