import { useState } from 'react';
import type { StrategyItem } from '../../api/client';
import Badge from '../shared/Badge';
import ScoreBar from '../shared/ScoreBar';

export default function StrategyCard({ strategy, onViewPlaybook }: { strategy: StrategyItem; onViewPlaybook: () => void }) {
  const total = strategy.success_count + strategy.failure_count;
  const successRate = total > 0 ? strategy.success_count / total : 0;
  const [showFailures, setShowFailures] = useState(false);

  return (
    <div className="card-hover">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-gray-200">{strategy.name}</h3>
            {strategy.strategy_type && <Badge variant="gray">{strategy.strategy_type}</Badge>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{strategy.summary}</p>
        </div>
        <div className="text-right ml-3">
          <div className="text-lg font-bold text-brand-400">{(strategy.quality_score * 100).toFixed(0)}</div>
          <div className="text-xs text-gray-400">Quality</div>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <ScoreBar value={strategy.quality_score} label="Quality" color="brand" />
        <ScoreBar value={strategy.confidence} label="Confidence" color="green" />
        <ScoreBar value={successRate} label="Success" color={successRate > 0.7 ? 'green' : 'amber'} />
      </div>

      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className="text-emerald-400">{strategy.success_count} wins</span>
        <span className="text-gray-500">/</span>
        <span className="text-red-400">{strategy.failure_count} fails</span>
        {strategy.support_count != null && (
          <span className="text-gray-400 ml-auto">{strategy.support_count} support</span>
        )}
      </div>

      {/* Expected values */}
      {(strategy.expected_success != null || strategy.expected_cost != null || strategy.expected_value != null) && (
        <div className="flex items-center gap-3 mb-2 text-xs text-gray-400">
          {strategy.expected_success != null && <span>Success: {(strategy.expected_success * 100).toFixed(0)}%</span>}
          {strategy.expected_cost != null && <span>Cost: {strategy.expected_cost.toFixed(2)}</span>}
          {strategy.expected_value != null && <span>Value: {strategy.expected_value.toFixed(2)}</span>}
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {strategy.applicable_domains?.map(d => (
          <Badge key={d} variant="gray">{d}</Badge>
        ))}
      </div>

      {strategy.when_to_use && (
        <p className="text-xs text-gray-400 mb-1"><span className="text-emerald-500">When:</span> {strategy.when_to_use}</p>
      )}
      {strategy.when_not_to_use && (
        <p className="text-xs text-gray-400 mb-2"><span className="text-red-500">Avoid:</span> {strategy.when_not_to_use}</p>
      )}

      {/* Counterfactual */}
      {strategy.counterfactual && (
        <p className="text-xs text-gray-500 italic mb-2">What if: {strategy.counterfactual}</p>
      )}

      {/* Failure modes */}
      {strategy.failure_modes?.length > 0 && (
        <div className="mb-2">
          <button
            onClick={() => setShowFailures(!showFailures)}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            {showFailures ? 'Hide' : 'Show'} failure modes ({strategy.failure_modes.length})
          </button>
          {showFailures && (
            <ul className="mt-1 space-y-0.5 pl-3">
              {strategy.failure_modes.map((fm, i) => (
                <li key={i} className="text-xs text-gray-400 list-disc">{fm}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {strategy.playbook && strategy.playbook.length > 0 && (
        <button onClick={onViewPlaybook} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
          View Playbook ({strategy.playbook.length} steps) →
        </button>
      )}
    </div>
  );
}
