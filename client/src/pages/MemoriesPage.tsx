import { useApiData, getMemories } from '../api/client';
import TierColumn from '../components/memory/TierColumn';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import LearnMoreBanner from '../components/shared/LearnMoreBanner';

const AGENT_ID = 1001;

export default function MemoriesPage() {
  const { data: memories, loading, refetch } = useApiData(() => getMemories(AGENT_ID, 50));

  return (
    <div className="p-6 h-full flex flex-col">
      <LearnMoreBanner
        title="Three-Tier Consolidation: Episodic → Semantic → Schema"
        description="Memories are formed from agent experiences and progressively consolidated into higher-order knowledge."
        sdkMethods={[
          { method: 'getAgentMemories(agentId)', endpoint: 'GET /memories/:agentId', description: 'Retrieves all memories for an agent, organized by tier with strength and relevance scores' },
        ]}
        responseFields={[
          { field: 'tier', type: 'enum', description: 'Episodic (raw), Semantic (consolidated), or Schema (abstract principles)' },
          { field: 'strength', type: 'number', description: 'Memory strength from 0-1, decays over time unless reinforced' },
          { field: 'relevance_score', type: 'number', description: 'Contextual relevance score based on recent queries' },
          { field: 'consolidation_status', type: 'string', description: 'Current consolidation pipeline stage' },
        ]}
      />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-200">Three-Tier Memory</h1>
          <p className="text-sm text-gray-500">
            Episodic → Semantic → Schema consolidation pipeline
          </p>
        </div>
        <button onClick={refetch} className="btn-secondary text-sm">Refresh</button>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : (
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          <TierColumn tier="Episodic" memories={(memories ?? []).filter(m => m.tier === 'Episodic')} />
          <TierColumn tier="Semantic" memories={(memories ?? []).filter(m => m.tier === 'Semantic')} />
          <TierColumn tier="Schema" memories={(memories ?? []).filter(m => m.tier === 'Schema')} />
        </div>
      )}
    </div>
  );
}
