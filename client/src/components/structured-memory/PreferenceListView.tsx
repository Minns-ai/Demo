import ScoreBar from '../shared/ScoreBar';

interface PreferenceData {
  ranked_items: { item: string; rank: number; score: number }[];
  provenance: string;
}

export default function PreferenceListView({ data }: { data: PreferenceData }) {
  const items = (data.ranked_items ?? []).slice().sort((a, b) => a.rank - b.rank);
  const maxScore = items.length > 0 ? Math.max(...items.map(i => i.score)) : 1;

  if (items.length === 0) {
    return (
      <div className="card text-center py-8 text-sm text-gray-500">
        No preferences recorded yet
      </div>
    );
  }

  return (
    <div className="card space-y-2">
      <div className="text-xs font-medium text-gray-400 mb-3">
        Ranked Preferences ({items.length})
      </div>
      {items.map((item, i) => (
        <div key={item.item} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-5 text-right shrink-0">#{item.rank}</span>
          <span className="text-sm text-gray-300 w-32 shrink-0 truncate">{item.item}</span>
          <div className="flex-1">
            <ScoreBar value={item.score} max={maxScore || 1} color={i === 0 ? 'brand' : i < 3 ? 'green' : 'gray'} />
          </div>
        </div>
      ))}
    </div>
  );
}
