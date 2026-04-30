import { useState } from 'react';
import type { MemoryItem, ClaimItem } from '../../api/client';
import type { LiveUpdate } from '../../hooks/useWebSocket';
import LiveFeed from './LiveFeed';
import Badge from '../shared/Badge';
import ScoreBar from '../shared/ScoreBar';

interface Props {
  memories: MemoryItem[];
  claims: ClaimItem[];
  updates: LiveUpdate[];
  wsConnected: boolean;
  onAskAbout?: (update: LiveUpdate) => void;
}

type Tab = 'live' | 'context';

export default function KnowledgePanel({ memories, claims, updates, wsConnected, onAskAbout }: Props) {
  const [tab, setTab] = useState<Tab>('live');

  const hasNewUpdates = updates.length > 0;

  return (
    <div className="h-full flex flex-col bg-surface-1 border-l border-surface-4">
      {/* Header */}
      <div className="p-3 border-b border-surface-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-gray-600'}`}
               style={wsConnected ? { boxShadow: '0 0 4px 1px rgba(52,211,153,0.4)' } : {}} />
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Intelligence</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-4">
        <button
          onClick={() => setTab('live')}
          className={`flex-1 py-2 text-[11px] font-medium transition-colors relative ${
            tab === 'live' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Live
          {hasNewUpdates && tab !== 'live' && (
            <span className="absolute top-1.5 right-4 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
          {tab === 'live' && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-400 rounded-full" />}
        </button>
        <button
          onClick={() => setTab('context')}
          className={`flex-1 py-2 text-[11px] font-medium transition-colors relative ${
            tab === 'context' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Context
          {(memories.length > 0 || claims.length > 0) && tab !== 'context' && (
            <span className="absolute top-1.5 right-4 w-1.5 h-1.5 rounded-full bg-brand-400" />
          )}
          {tab === 'context' && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-400 rounded-full" />}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'live' ? (
          <LiveFeed updates={updates} onAskAbout={onAskAbout} />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Memories */}
            {memories.length > 0 && (
              <section>
                <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Memories Recalled ({memories.length})
                </h4>
                <div className="flex flex-col gap-1.5">
                  {memories.slice(0, 6).map((m, i) => (
                    <div key={i} className="p-2 bg-surface-2 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant={m.tier === 'Schema' ? 'amber' : m.tier === 'Semantic' ? 'green' : 'brand'}>
                          {m.tier}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-gray-300 line-clamp-2">{m.summary}</p>
                      <ScoreBar value={m.strength} label="Strength" color="brand" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Claims */}
            {claims.length > 0 && (
              <section>
                <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Facts Retrieved ({claims.length})
                </h4>
                <div className="flex flex-col gap-1.5">
                  {claims.slice(0, 6).map((c, i) => (
                    <div key={i} className="p-2 bg-surface-2 rounded-lg">
                      <p className="text-[11px] text-gray-300 line-clamp-2">{c.claim_text || c.text}</p>
                      <ScoreBar value={c.confidence ?? c.similarity ?? 0} label="Match" color="green" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {memories.length === 0 && claims.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg className="w-8 h-8 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-xs">No context activated yet</p>
                <p className="text-[10px] text-gray-600 mt-1">Ask a question to see what fires</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
