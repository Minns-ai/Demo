import { useState } from 'react';
import { useApiData, getHealth, getStats, listStructuredMemory, queryNLQ } from '../api/client';
import type { NLQResponse, StructuredMemoryListResponse } from '../api/client';
import Badge from '../components/shared/Badge';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import LearnMoreBanner from '../components/shared/LearnMoreBanner';

export default function DashboardPage() {
  const { data: health, loading: hLoading } = useApiData(getHealth);
  const { data: stats, loading: sLoading } = useApiData(getStats);

  if (hLoading || sLoading) return <LoadingSpinner size="lg" />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-200">Dashboard</h1>
        <p className="text-sm text-gray-500">System health, processing stats, and learning metrics</p>
      </div>

      <LearnMoreBanner
        title="Real-time MINNS Engine Overview"
        description="System health, processing throughput, store statistics, and learning progress from the MINNS SDK."
        sdkMethods={[
          { method: 'getHealth()', endpoint: 'GET /health', description: 'Returns engine status, version, uptime, node/edge counts, and processing rate' },
          { method: 'getStats()', endpoint: 'GET /stats', description: 'Returns aggregate processing stats, per-store breakdowns, and learning totals' },
        ]}
        responseFields={[
          { field: 'is_healthy', type: 'boolean', description: 'Whether the engine is in a healthy state' },
          { field: 'processing_rate', type: 'number', description: 'Events processed per second' },
          { field: 'stores', type: 'object', description: 'Per-store stats: memories, strategies, claims, graph' },
          { field: 'total_memories_formed', type: 'number', description: 'Cumulative memories consolidated across all agents' },
        ]}
      />

      {/* Health Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Status" value={health?.status ?? 'unknown'} badge={health?.is_healthy ? 'green' : 'red'} />
        <StatCard label="Version" value={health?.version ?? '-'} />
        <StatCard label="Uptime" value={formatUptime(health?.uptime_seconds)} />
        <StatCard label="Processing Rate" value={`${health?.processing_rate?.toFixed(1) ?? 0}/s`} />
      </div>

      {/* Processing Stats */}
      <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Processing Stats</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Events Processed" value={stats?.total_events_processed ?? 0} />
        <StatCard label="Nodes Created" value={stats?.total_nodes_created ?? 0} />
        <StatCard label="Episodes Detected" value={stats?.total_episodes_detected ?? 0} />
        <StatCard label="Avg Processing Time" value={`${stats?.average_processing_time_ms?.toFixed(1) ?? 0}ms`} />
      </div>

      {/* Store Stats */}
      <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Stores</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StoreCard
          title="Memories"
          items={[
            { l: 'Total', v: stats?.stores.memories.total ?? 0 },
            { l: 'Avg Strength', v: (stats?.stores.memories.avg_strength ?? 0).toFixed(2) },
            { l: 'Avg Access', v: (stats?.stores.memories.avg_access_count ?? 0).toFixed(1) },
            { l: 'Agents', v: stats?.stores.memories.agents_with_memories ?? 0 },
          ]}
        />
        <StoreCard
          title="Strategies"
          items={[
            { l: 'Total', v: stats?.stores.strategies.total ?? 0 },
            { l: 'High Quality', v: stats?.stores.strategies.high_quality ?? 0 },
            { l: 'Avg Quality', v: (stats?.stores.strategies.avg_quality ?? 0).toFixed(2) },
            { l: 'Agents', v: stats?.stores.strategies.agents_with_strategies ?? 0 },
          ]}
        />
        <StoreCard
          title="Claims"
          items={[
            { l: 'Total', v: stats?.stores.claims.total ?? 0 },
            { l: 'Indexed', v: stats?.stores.claims.embeddings_indexed ?? 0 },
          ]}
        />
        <StoreCard
          title="Graph"
          items={[
            { l: 'Nodes', v: stats?.stores.graph.nodes ?? 0 },
            { l: 'Edges', v: stats?.stores.graph.edges ?? 0 },
            { l: 'Avg Degree', v: (stats?.stores.graph.avg_degree ?? 0).toFixed(1) },
            { l: 'Largest Comp.', v: stats?.stores.graph.largest_component ?? 0 },
          ]}
        />
      </div>

      {/* Learning */}
      <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Learning Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Memories Formed" value={stats?.total_memories_formed ?? 0} />
        <StatCard label="Strategies Extracted" value={stats?.total_strategies_extracted ?? 0} />
        <StatCard label="Reinforcements" value={stats?.total_reinforcements_applied ?? 0} />
      </div>

      {/* Structured Memory Stats */}
      <StructuredMemoryStats />

      {/* Quick NLQ Widget */}
      <QuickNLQWidget />
    </div>
  );
}

function StructuredMemoryStats() {
  const { data: listData } = useApiData<StructuredMemoryListResponse>(() => listStructuredMemory(), []);
  const keys = listData?.keys ?? [];
  const total = keys.length;

  const breakdown: Record<string, number> = {};
  for (const key of keys) {
    const prefix = key.split(':')[0] || 'other';
    breakdown[prefix] = (breakdown[prefix] || 0) + 1;
  }

  return (
    <>
      <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Structured Memory</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Keys" value={total} />
        {Object.entries(breakdown).slice(0, 3).map(([prefix, count]) => (
          <StatCard key={prefix} label={prefix} value={count} />
        ))}
      </div>
    </>
  );
}

function QuickNLQWidget() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<NLQResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await queryNLQ(question);
      setResult(res);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Quick NLQ</h2>
      <div className="card">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Ask a quick question..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            className="flex-1 bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={handleAsk}
            disabled={loading || !question.trim()}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
          >
            {loading ? '...' : 'Ask'}
          </button>
        </div>
        {result && (
          <div className="bg-surface-3 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={result.confidence >= 0.8 ? 'green' : result.confidence >= 0.5 ? 'amber' : 'red'}>
                {(result.confidence * 100).toFixed(0)}%
              </Badge>
              {result.execution_time_ms != null && (
                <span className="text-xs text-gray-400">{result.execution_time_ms.toFixed(0)}ms</span>
              )}
            </div>
            <div className="text-sm text-gray-300">{result.answer}</div>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, badge }: { label: string; value: string | number; badge?: 'green' | 'red' | 'amber' }) {
  return (
    <div className="card">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-gray-200">{value}</span>
        {badge && <Badge variant={badge}>{badge === 'green' ? 'Healthy' : 'Degraded'}</Badge>}
      </div>
    </div>
  );
}

function StoreCard({ title, items }: { title: string; items: { l: string; v: string | number }[] }) {
  return (
    <div className="card">
      <div className="text-xs font-medium text-gray-300 mb-2">{title}</div>
      {items.map(({ l, v }) => (
        <div key={l} className="flex items-center justify-between py-1 text-xs">
          <span className="text-gray-500">{l}</span>
          <span className="text-gray-300 font-medium">{v}</span>
        </div>
      ))}
    </div>
  );
}

function formatUptime(seconds?: number): string {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
