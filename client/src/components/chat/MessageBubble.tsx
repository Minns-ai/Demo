import { useState } from 'react';
import IntentBadge from './IntentBadge';
import KnowledgeModal from './KnowledgeModal';
import type { MemoryItem, ClaimItem } from '../../api/client';

export interface NLQMeta {
  queryType: string;
  queryTimeMs: number;
  memoriesFound: number;
  strategiesFound: number;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  text: string;
  intent?: string;
  confidence?: number;
  slots?: Record<string, string>;
  memoriesUsed?: MemoryItem[];
  claimsUsed?: ClaimItem[];
  nlqMeta?: NLQMeta;
  timestamp: number;
}

const tierBadge: Record<string, string> = {
  Episodic: 'Ep',
  Semantic: 'Sem',
  Schema:   'Sch',
};

function cleanSummary(raw: string): string {
  const goalMatch = raw.match(/^Goal:\s*(\S+)/);
  if (goalMatch) {
    const label = goalMatch[1].replace(/_/g, ' ').replace(/\.$/, '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return raw.length > 40 ? raw.slice(0, 40) + '...' : raw;
}

type ModalState =
  | { type: 'memory'; item: MemoryItem }
  | { type: 'claim'; item: ClaimItem }
  | null;

const queryTypeLabels: Record<string, { label: string; dotColor: string }> = {
  numeric: { label: 'numeric', dotColor: 'bg-blue-400' },
  state: { label: 'state', dotColor: 'bg-emerald-400' },
  entity_summary: { label: 'entity', dotColor: 'bg-violet-400' },
  preference: { label: 'preference', dotColor: 'bg-amber-400' },
  relationship: { label: 'relationship', dotColor: 'bg-rose-400' },
  nlq: { label: 'nlq', dotColor: 'bg-cyan-400' },
};

export default function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const [modal, setModal] = useState<ModalState>(null);

  const hasKnowledge =
    !isUser &&
    ((msg.memoriesUsed && msg.memoriesUsed.length > 0) ||
     (msg.claimsUsed && msg.claimsUsed.length > 0));

  return (
    <>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5 animate-fade-in-up`}>
        {!isUser && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mr-3 mt-0.5 shadow-sm">
            M
          </div>
        )}

        <div className={`max-w-[75%]`}>
          {/* Knowledge tags row */}
          {hasKnowledge && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {msg.memoriesUsed?.map((mem, i) => (
                <button
                  key={`mem-${i}`}
                  onClick={() => setModal({ type: 'memory', item: mem })}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium leading-tight border cursor-pointer bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 transition-colors"
                >
                  <span className="font-semibold">{tierBadge[mem.tier] ?? mem.tier}</span>
                  <span className="truncate max-w-[120px]">{cleanSummary(mem.summary)}</span>
                </button>
              ))}
              {msg.claimsUsed?.map((claim, i) => (
                <button
                  key={`clm-${i}`}
                  onClick={() => setModal({ type: 'claim', item: claim })}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium leading-tight border cursor-pointer bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <span className="truncate max-w-[140px]">{claim.claim_text ?? claim.text ?? 'claim'}</span>
                </button>
              ))}
            </div>
          )}

          {/* Message bubble */}
          <div className={`px-4 py-3 text-sm leading-[1.7] ${
            isUser
              ? 'bg-gradient-to-r from-brand-500 to-brand-400 text-white rounded-2xl rounded-br-md shadow-sm'
              : 'bg-gray-50 text-gray-700 rounded-2xl rounded-bl-md border border-gray-100'
          }`}>
            {msg.text.split('\n').map((line, i) => (
              <p key={i} className={i > 0 ? 'mt-2' : ''}>
                {line.split(/(\*\*.*?\*\*)/g).map((part, j) =>
                  part.startsWith('**') && part.endsWith('**')
                    ? <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
                    : part
                )}
              </p>
            ))}
          </div>

          {/* Elegant NLQ metadata pill — subtle, not intrusive */}
          {!isUser && msg.nlqMeta && (
            <div className="flex items-center gap-2 mt-1.5">
              {(() => {
                const qt = queryTypeLabels[msg.nlqMeta.queryType] ?? queryTypeLabels.nlq;
                return (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                    <div className={`w-1.5 h-1.5 rounded-full ${qt.dotColor}`} />
                    <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wide">{qt.label}</span>
                    <span className="text-[9px] text-gray-400 font-mono">{msg.nlqMeta.queryTimeMs}ms</span>
                  </div>
                );
              })()}
              {msg.nlqMeta.memoriesFound > 0 && (
                <span className="text-[9px] text-gray-400">{msg.nlqMeta.memoriesFound} memories</span>
              )}
            </div>
          )}

          {!isUser && msg.intent && (
            <div className="mt-2 flex items-center gap-2">
              <IntentBadge intent={msg.intent} confidence={msg.confidence} />
              {msg.slots && Object.keys(msg.slots).length > 0 && (
                <span className="text-[10px] text-gray-400 font-mono">
                  {Object.entries(msg.slots).map(([k, v]) => `${k}=${v}`).join(' ')}
                </span>
              )}
            </div>
          )}

          <div className={`text-[10px] text-gray-400 mt-1.5 ${isUser ? 'text-right' : ''}`}>
            {new Date(msg.timestamp).toLocaleTimeString()}
          </div>
        </div>

        {isUser && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ml-3 mt-0.5 shadow-sm">
            U
          </div>
        )}
      </div>

      {modal && (
        <KnowledgeModal
          type={modal.type}
          item={modal.item as any}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
