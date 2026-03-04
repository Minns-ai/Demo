import type { MemoryItem } from '../../api/client';
import Badge from '../shared/Badge';
import ScoreBar from '../shared/ScoreBar';

const tierVariant = { Episodic: 'brand' as const, Semantic: 'green' as const, Schema: 'amber' as const };
const outcomeVariant = (o: string) => o === 'success' ? 'green' as const : o === 'failure' ? 'red' as const : 'gray' as const;

function formatTimestamp(ts: number | string | undefined): string | null {
  if (ts == null) return null;
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MemoryCard({ memory }: { memory: MemoryItem }) {
  const formedStr = formatTimestamp(memory.formed_at);
  const accessedStr = formatTimestamp(memory.last_accessed);

  return (
    <div className="card-hover mb-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Badge variant={tierVariant[memory.tier]}>{memory.tier}</Badge>
        <Badge variant={outcomeVariant(memory.outcome)}>{memory.outcome}</Badge>
        {memory.memory_type && <Badge variant="gray">{memory.memory_type}</Badge>}
        <span className="text-xs text-gray-400 ml-auto">#{String(memory.id).slice(-6)}</span>
      </div>
      <p className="text-sm text-gray-200 mb-1">{memory.summary}</p>
      <p className="text-xs text-gray-400 mb-2 italic">"{memory.takeaway}"</p>
      {memory.causal_note && (
        <p className="text-xs text-gray-400 mb-2">Cause: {memory.causal_note}</p>
      )}
      <div className="space-y-1">
        <ScoreBar value={memory.strength} label="Strength" color={memory.strength > 0.7 ? 'green' : 'amber'} />
        <ScoreBar value={memory.relevance_score} label="Relevance" color="brand" />
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-400 flex-wrap gap-1">
        <span>Accessed {memory.access_count}x</span>
        {formedStr && <span>Formed {formedStr}</span>}
        {accessedStr && <span>Last accessed {accessedStr}</span>}
        <span>{memory.consolidation_status}</span>
      </div>
    </div>
  );
}
