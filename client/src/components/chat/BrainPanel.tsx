import type { MemoryItem, StrategyItem, ClaimItem } from '../../api/client';
import Badge from '../shared/Badge';
import ScoreBar from '../shared/ScoreBar';

interface Props {
  memories: MemoryItem[];
  strategies: StrategyItem[];
  claims: ClaimItem[];
  actionSuggestions: unknown[];
  eventsEmitted: string[];
}

export default function BrainPanel({ memories, strategies, claims, actionSuggestions, eventsEmitted }: Props) {
  return (
    <div className="w-72 border-r border-surface-4 bg-surface-1 overflow-y-auto flex flex-col">
      <div className="p-3 border-b border-surface-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Agent Brain</h3>
      </div>

      {/* Memories */}
      <Section title="Memories Recalled" count={memories.length} color="brand">
        {memories.slice(0, 5).map((m, i) => (
          <div key={i} className="p-2 bg-surface-2 rounded-lg mb-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Badge variant={m.tier === 'Schema' ? 'amber' : m.tier === 'Semantic' ? 'green' : 'brand'}>{m.tier}</Badge>
            </div>
            <p className="text-xs text-gray-300 line-clamp-2">{m.summary}</p>
            <ScoreBar value={m.strength} label="Strength" color="brand" />
          </div>
        ))}
        {memories.length === 0 && <Empty />}
      </Section>

      {/* Strategies */}
      <Section title="Strategies Consulted" count={strategies.length} color="green">
        {strategies.slice(0, 3).map((s, i) => (
          <div key={i} className="p-2 bg-surface-2 rounded-lg mb-1.5">
            <p className="text-xs font-medium text-gray-200">{s.name}</p>
            <p className="text-[11px] text-gray-400 line-clamp-1">{s.summary}</p>
            <ScoreBar value={s.quality_score} label="Quality" color="green" />
          </div>
        ))}
        {strategies.length === 0 && <Empty />}
      </Section>

      {/* Claims */}
      <Section title="Claims Found" count={claims.length} color="amber">
        {claims.slice(0, 3).map((c, i) => (
          <div key={i} className="p-2 bg-surface-2 rounded-lg mb-1.5">
            <p className="text-xs text-gray-300 line-clamp-2">{c.claim_text || c.text || JSON.stringify(c)}</p>
            {c.similarity != null && <ScoreBar value={c.similarity} label="Match" color="amber" />}
          </div>
        ))}
        {claims.length === 0 && <Empty />}
      </Section>

      {/* Events */}
      <Section title="Events Emitted" count={eventsEmitted.length} color="brand">
        <div className="flex flex-wrap gap-1">
          {eventsEmitted.map((e, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-surface-3 rounded text-gray-400">{e}</span>
          ))}
        </div>
        {eventsEmitted.length === 0 && <Empty />}
      </Section>
    </div>
  );
}

function Section({ title, count, color, children }: { title: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <div className="p-3 border-b border-surface-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-gray-400">{title}</span>
        <Badge variant={color as any}>{count}</Badge>
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-[11px] text-gray-600 italic">No data for this turn</p>;
}
