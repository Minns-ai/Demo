import { useState } from 'react';
import { useApiData, getStrategies, StrategyItem } from '../api/client';
import StrategyCard from '../components/strategy/StrategyCard';
import PlaybookViewer from '../components/strategy/PlaybookViewer';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import LearnMoreBanner from '../components/shared/LearnMoreBanner';

const AGENT_ID = 1001;

export default function StrategiesPage() {
  const { data: strategies, loading, refetch } = useApiData(() => getStrategies(AGENT_ID, 20));
  const [viewingPlaybook, setViewingPlaybook] = useState<StrategyItem | null>(null);

  return (
    <div className="p-6">
      <LearnMoreBanner
        title="Learned Behavioral Playbooks from Successful Patterns"
        description="Strategies emerge as the agent discovers and reinforces successful action sequences across contexts."
        sdkMethods={[
          { method: 'getAgentStrategies(agentId)', endpoint: 'GET /strategies/:agentId', description: 'Returns learned strategies with quality scores, playbooks, failure modes, and applicability domains' },
        ]}
        responseFields={[
          { field: 'quality_score', type: 'number', description: 'Overall strategy quality from 0-1 based on success rate and reinforcement' },
          { field: 'playbook', type: 'PlaybookStep[]', description: 'Ordered steps with conditions, recovery actions, and branching logic' },
          { field: 'failure_modes', type: 'string[]', description: 'Known failure scenarios for this strategy' },
          { field: 'counterfactual', type: 'string', description: 'What-if analysis of alternative approaches' },
        ]}
      />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-200">Strategy System</h1>
          <p className="text-sm text-gray-500">Learned strategies with quality scores, playbooks, and applicability</p>
        </div>
        <button onClick={refetch} className="btn-secondary text-sm">Refresh</button>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(strategies ?? []).map(s => (
            <StrategyCard key={s.id} strategy={s} onViewPlaybook={() => setViewingPlaybook(s)} />
          ))}
          {(!strategies || strategies.length === 0) && (
            <div className="col-span-full card text-center py-12">
              <p className="text-gray-500">No strategies learned yet</p>
              <p className="text-xs text-gray-600 mt-1">Strategies emerge as the agent processes events and discovers patterns</p>
            </div>
          )}
        </div>
      )}

      {viewingPlaybook && (
        <PlaybookViewer
          steps={viewingPlaybook.playbook}
          strategyName={viewingPlaybook.name}
          onClose={() => setViewingPlaybook(null)}
        />
      )}
    </div>
  );
}
