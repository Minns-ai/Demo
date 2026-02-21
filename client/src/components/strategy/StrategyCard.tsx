import type { StrategyItem } from '../../api/client';
import Badge from '../shared/Badge';
import ScoreBar from '../shared/ScoreBar';

export default function StrategyCard({ strategy, onViewPlaybook }: { strategy: StrategyItem; onViewPlaybook: () => void }) {
  const total = strategy.success_count + strategy.failure_count;
  const successRate = total > 0 ? strategy.success_count / total : 0;

  return (
    <div className="card-hover">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-medium text-gray-200">{strategy.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{strategy.summary}</p>
        </div>
        <div className="text-right ml-3">
          <div className="text-lg font-bold text-brand-400">{(strategy.quality_score * 100).toFixed(0)}</div>
          <div className="text-[10px] text-gray-500">Quality</div>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <ScoreBar value={strategy.quality_score} label="Quality" color="brand" />
        <ScoreBar value={strategy.confidence} label="Confidence" color="green" />
        <ScoreBar value={successRate} label="Success" color={successRate > 0.7 ? 'green' : 'amber'} />
      </div>

      <div className="flex items-center gap-2 mb-2 text-[11px]">
        <span className="text-emerald-400">{strategy.success_count} wins</span>
        <span className="text-gray-600">/</span>
        <span className="text-red-400">{strategy.failure_count} fails</span>
      </div>

      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {strategy.applicable_domains?.map(d => (
          <Badge key={d} variant="gray">{d}</Badge>
        ))}
      </div>

      {strategy.when_to_use && (
        <p className="text-[11px] text-gray-500 mb-1"><span className="text-emerald-500">When:</span> {strategy.when_to_use}</p>
      )}
      {strategy.when_not_to_use && (
        <p className="text-[11px] text-gray-500 mb-2"><span className="text-red-500">Avoid:</span> {strategy.when_not_to_use}</p>
      )}

      {strategy.playbook && strategy.playbook.length > 0 && (
        <button onClick={onViewPlaybook} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
          View Playbook ({strategy.playbook.length} steps) →
        </button>
      )}
    </div>
  );
}
