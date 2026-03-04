import { useNavigate } from 'react-router-dom';
import LearnMoreBanner from '../components/shared/LearnMoreBanner';

interface ArchNode {
  label: string;
  description: string;
  color: string;
  page: string;
  methods: string[];
  icon: string;
}

const tier1: ArchNode[] = [
  {
    label: 'User Input',
    description: 'Customer messages & API requests',
    color: 'border-l-blue-400',
    page: '/chat',
    methods: ['sendMessageSSE()'],
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  },
];

const tier2: ArchNode[] = [
  {
    label: 'ReAct Agent Loop',
    description: 'Perceive → Act → Learn cycle',
    color: 'border-l-purple-400',
    page: '/chat',
    methods: ['perceiveActLearn()', 'processEvent()'],
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  },
  {
    label: 'MINNS SDK',
    description: 'Memory, Intelligence & Neural Network System',
    color: 'border-l-brand-400',
    page: '/dashboard',
    methods: ['healthCheck()', 'getStats()'],
    icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
  },
];

const tier3: ArchNode[] = [
  {
    label: 'Memory',
    description: '3-tier consolidation',
    color: 'border-l-yellow-400',
    page: '/memories',
    methods: ['getAgentMemories()'],
    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  },
  {
    label: 'Strategy',
    description: 'Learned playbooks',
    color: 'border-l-emerald-400',
    page: '/strategies',
    methods: ['getAgentStrategies()'],
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  {
    label: 'Claims',
    description: 'Semantic search',
    color: 'border-l-amber-400',
    page: '/claims',
    methods: ['searchClaims()'],
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
  {
    label: 'Graph',
    description: 'Knowledge graph',
    color: 'border-l-cyan-400',
    page: '/graph',
    methods: ['getGraph()'],
    icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  },
];

const tier4: ArchNode[] = [
  {
    label: 'NLQ',
    description: 'Natural language queries',
    color: 'border-l-pink-400',
    page: '/nlq',
    methods: ['nlq()'],
    icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    label: 'Conversations',
    description: 'Ingest & query',
    color: 'border-l-indigo-400',
    page: '/conversations',
    methods: ['ingestConversations()'],
    icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-1m0 0V6a2 2 0 012-2h8a2 2 0 012 2v5a2 2 0 01-2 2h-2l-4 4v-4H9z',
  },
  {
    label: 'Structured Memory',
    description: 'Typed templates',
    color: 'border-l-violet-400',
    page: '/structured-memory',
    methods: ['upsertStructuredMemory()'],
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
  },
  {
    label: 'Events',
    description: 'Semantic event stream',
    color: 'border-l-rose-400',
    page: '/chat',
    methods: ['processEvent()'],
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
];

function NodeCard({ node, onClick }: { node: ArchNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-surface-2 hover:bg-surface-3 border-l-4 ${node.color} rounded-xl p-3 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 group w-full`}
    >
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={node.icon} />
        </svg>
        <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{node.label}</span>
      </div>
      <div className="text-[11px] text-gray-500 mb-2">{node.description}</div>
      <div className="flex flex-wrap gap-1">
        {node.methods.map(m => (
          <span key={m} className="text-[9px] font-mono px-1.5 py-0.5 bg-surface-4 rounded text-brand-300">
            {m}
          </span>
        ))}
      </div>
    </button>
  );
}

function ConnectorArrow({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <svg width="24" height="32" viewBox="0 0 24 32" className="text-gray-600">
        <line x1="12" y1="0" x2="12" y2="24" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.5s" repeatCount="indefinite" />
        </line>
        <path d="M7 20 L12 28 L17 20" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function BidirectionalArrow() {
  return (
    <div className="flex items-center justify-center px-2">
      <svg width="40" height="24" viewBox="0 0 40 24" className="text-gray-600">
        <line x1="6" y1="12" x2="34" y2="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.5s" repeatCount="indefinite" />
        </line>
        <path d="M2 12 L8 8 L8 16 Z" fill="currentColor" opacity="0.5" />
        <path d="M38 12 L32 8 L32 16 Z" fill="currentColor" opacity="0.5" />
      </svg>
    </div>
  );
}

export default function ArchitecturePage() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto bg-surface-1 rounded-2xl">
      <div className="max-w-4xl mx-auto p-6">
        <LearnMoreBanner
          title="Architecture Overview"
          description="This diagram shows the full data flow from user input through the ReAct agent loop, into the MINNS SDK, and across all storage subsystems. The perceiveActLearn() lifecycle orchestrates the entire flow."
          sdkMethods={[
            { method: 'perceiveActLearn()', endpoint: 'POST /chat', description: 'Full agent lifecycle: recall context → reason → act → learn from outcome' },
            { method: 'processEvent()', endpoint: 'POST /events', description: 'Core event processing — triggers memory formation, claim extraction, and graph updates' },
          ]}
        />

        {/* Tier 1: User Input */}
        <div className="flex justify-center">
          <div className="w-72">
            {tier1.map(n => (
              <NodeCard key={n.label} node={n} onClick={() => navigate(n.page)} />
            ))}
          </div>
        </div>

        <ConnectorArrow className="my-2" />

        {/* Tier 2: Agent + SDK */}
        <div className="flex items-center justify-center gap-0">
          <div className="w-72">
            <NodeCard node={tier2[0]} onClick={() => navigate(tier2[0].page)} />
          </div>
          <BidirectionalArrow />
          <div className="w-72">
            <NodeCard node={tier2[1]} onClick={() => navigate(tier2[1].page)} />
          </div>
        </div>

        <ConnectorArrow className="my-2" />

        {/* Tier 3: Core stores */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold text-center mb-2">Core Stores</div>
          <div className="grid grid-cols-4 gap-2">
            {tier3.map(n => (
              <NodeCard key={n.label} node={n} onClick={() => navigate(n.page)} />
            ))}
          </div>
        </div>

        <ConnectorArrow className="my-2" />

        {/* Tier 4: Extended capabilities */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold text-center mb-2">Extended Capabilities</div>
          <div className="grid grid-cols-4 gap-2">
            {tier4.map(n => (
              <NodeCard key={n.label} node={n} onClick={() => navigate(n.page)} />
            ))}
          </div>
        </div>

        {/* Data flow legend */}
        <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <svg width="20" height="2" className="text-gray-600">
              <line x1="0" y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
            <span>Data flow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 border-l-2 border-brand-400 rounded-sm bg-surface-3" />
            <span>Click to navigate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono px-1 py-0.5 bg-surface-4 rounded text-brand-300 text-[8px]">method()</span>
            <span>SDK method</span>
          </div>
        </div>
      </div>
    </div>
  );
}
