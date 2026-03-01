import { useState } from 'react';
import IntentBadge from './IntentBadge';
import KnowledgeModal from './KnowledgeModal';
import type { MemoryItem, ClaimItem } from '../../api/client';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  text: string;
  intent?: string;
  confidence?: number;
  slots?: Record<string, string>;
  memoriesUsed?: MemoryItem[];
  claimsUsed?: ClaimItem[];
  timestamp: number;
}

const tierBadge: Record<string, string> = {
  Episodic: 'Ep',
  Semantic: 'Sem',
  Schema:   'Sch',
};

/** Extract a clean label from a MINNS auto-generated episode summary. */
function cleanSummary(raw: string): string {
  // Try to pull just the goal name: "Goal: track_order. Context: ..." → "track_order"
  const goalMatch = raw.match(/^Goal:\s*(\S+)/);
  if (goalMatch) {
    // Turn snake_case into readable: "track_order" → "Track order"
    const label = goalMatch[1].replace(/_/g, ' ').replace(/\.$/, '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  // Fallback: first 40 chars
  return raw.length > 40 ? raw.slice(0, 40) + '...' : raw;
}

type ModalState =
  | { type: 'memory'; item: MemoryItem }
  | { type: 'claim'; item: ClaimItem }
  | null;

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
        {/* Agent Avatar */}
        {!isUser && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mr-3 mt-0.5 shadow-sm">
            M
          </div>
        )}

        <div className={`max-w-[70%]`}>
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

        {/* User Avatar */}
        {isUser && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ml-3 mt-0.5 shadow-sm">
            U
          </div>
        )}
      </div>

      {/* Knowledge detail modal */}
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
