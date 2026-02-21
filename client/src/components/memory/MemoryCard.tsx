import type { MemoryItem } from '../../api/client';
import Badge from '../shared/Badge';
import ScoreBar from '../shared/ScoreBar';

const tierVariant = { Episodic: 'brand' as const, Semantic: 'green' as const, Schema: 'amber' as const };
const outcomeVariant = (o: string) => o === 'success' ? 'green' as const : o === 'failure' ? 'red' as const : 'gray' as const;

export default function MemoryCard({ memory }: { memory: MemoryItem }) {
  return (
    <div className="card-hover mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant={tierVariant[memory.tier]}>{memory.tier}</Badge>
        <Badge variant={outcomeVariant(memory.outcome)}>{memory.outcome}</Badge>
        <span className="text-[10px] text-gray-600 ml-auto">#{String(memory.id).slice(-6)}</span>
      </div>
      <p className="text-sm text-gray-200 mb-1">{memory.summary}</p>
      <p className="text-xs text-gray-400 mb-2 italic">"{memory.takeaway}"</p>
      {memory.causal_note && (
        <p className="text-[11px] text-gray-500 mb-2">Cause: {memory.causal_note}</p>
      )}
      <div className="space-y-1">
        <ScoreBar value={memory.strength} label="Strength" color={memory.strength > 0.7 ? 'green' : 'amber'} />
        <ScoreBar value={memory.relevance_score} label="Relevance" color="brand" />
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] text-gray-600">
        <span>Accessed {memory.access_count}x</span>
        <span>{memory.consolidation_status}</span>
      </div>
    </div>
  );
}
