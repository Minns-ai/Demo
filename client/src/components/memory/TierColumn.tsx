import type { MemoryItem } from '../../api/client';
import MemoryCard from './MemoryCard';
import Badge from '../shared/Badge';

const tierInfo = {
  Episodic: { desc: 'Raw experiences, recent events', variant: 'brand' as const },
  Semantic: { desc: 'Consolidated knowledge & patterns', variant: 'green' as const },
  Schema: { desc: 'High-level abstractions & principles', variant: 'amber' as const },
};

export default function TierColumn({ tier, memories }: { tier: 'Episodic' | 'Semantic' | 'Schema'; memories: MemoryItem[] }) {
  const info = tierInfo[tier];
  return (
    <div className="flex-1 min-w-[280px]">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant={info.variant}>{tier}</Badge>
        <span className="text-xs text-gray-400">{info.desc}</span>
        <span className="text-xs text-gray-400 ml-auto">{memories.length}</span>
      </div>
      <div className="space-y-0">
        {memories.map(m => <MemoryCard key={String(m.id)} memory={m} />)}
        {memories.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-sm text-gray-500">No {tier.toLowerCase()} memories yet</p>
            <p className="text-xs text-gray-600 mt-1">Send messages to build memory</p>
          </div>
        )}
      </div>
    </div>
  );
}
