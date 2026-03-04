import { useState, useCallback, useRef, useEffect } from 'react';
import { useApiData, getGraph, getAnalytics } from '../api/client';
import Badge from '../components/shared/Badge';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import LearnMoreBanner from '../components/shared/LearnMoreBanner';

const NODE_COLORS: Record<string, string> = {
  action: '#6366f1',
  observation: '#10b981',
  cognitive: '#f59e0b',
  communication: '#3b82f6',
  learning: '#8b5cf6',
  context: '#ec4899',
  memory: '#14b8a6',
  strategy: '#f97316',
  default: '#6b7280',
};

export default function GraphPage() {
  const { data: graph, loading } = useApiData(() => getGraph(200));
  const { data: analytics } = useApiData(getAnalytics);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<any>(null);
  const nodesRef = useRef<any[]>([]);

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graph) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const cw = w / 2, ch = h / 2;

    ctx.fillStyle = '#0b0d13';
    ctx.fillRect(0, 0, cw, ch);

    if (graph.nodes.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No graph data yet. Send some chat messages to build the graph.', cw / 2, ch / 2);
      return;
    }

    // Layout: force-directed approximation with fixed iterations
    const nodes = graph.nodes.map((n, i) => ({
      ...n,
      x: cw / 2 + (Math.cos(i * 2.399) * Math.min(cw, ch) * 0.35),
      y: ch / 2 + (Math.sin(i * 2.399) * Math.min(cw, ch) * 0.35),
      vx: 0, vy: 0,
    }));

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Simple force simulation
    for (let iter = 0; iter < 80; iter++) {
      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          let dx = nodes[j].x - nodes[i].x;
          let dy = nodes[j].y - nodes[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 800 / (dist * dist);
          dx = (dx / dist) * force;
          dy = (dy / dist) * force;
          nodes[i].vx -= dx; nodes[i].vy -= dy;
          nodes[j].vx += dx; nodes[j].vy += dy;
        }
      }
      // Attraction (edges)
      for (const edge of graph.edges) {
        const src = nodeMap.get(edge.from);
        const tgt = nodeMap.get(edge.to);
        if (!src || !tgt) continue;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = dist * 0.005;
        src.vx += dx * force; src.vy += dy * force;
        tgt.vx -= dx * force; tgt.vy -= dy * force;
      }
      // Center gravity
      for (const n of nodes) {
        n.vx += (cw / 2 - n.x) * 0.001;
        n.vy += (ch / 2 - n.y) * 0.001;
        n.x += n.vx * 0.4;
        n.y += n.vy * 0.4;
        n.vx *= 0.8; n.vy *= 0.8;
        n.x = Math.max(20, Math.min(cw - 20, n.x));
        n.y = Math.max(20, Math.min(ch - 20, n.y));
      }
    }

    nodesRef.current = nodes;

    // Draw edges
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 0.5;
    for (const edge of graph.edges) {
      const src = nodeMap.get(edge.from);
      const tgt = nodeMap.get(edge.to);
      if (!src || !tgt) continue;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
    }

    // Draw nodes
    for (const n of nodes) {
      const color = NODE_COLORS[n.node_type?.toLowerCase()] || NODE_COLORS.default;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (selected?.id === n.id) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [graph, selected]);

  useEffect(() => { drawGraph(); }, [drawGraph]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = nodesRef.current.find(n => {
      const dx = n.x - x, dy = n.y - y;
      return dx * dx + dy * dy < 100;
    });
    setSelected(hit || null);
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <LearnMoreBanner
        title="Knowledge Graph with Analytics and Learning Metrics"
        description="Visualize the EventGraph structure, inspect node properties, and monitor graph analytics and learning progress."
        sdkMethods={[
          { method: 'getGraph()', endpoint: 'GET /graph', description: 'Returns graph nodes and edges with types, labels, and properties' },
          { method: 'getAnalytics()', endpoint: 'GET /analytics', description: 'Returns graph analytics (components, clustering, modularity) and learning metrics' },
        ]}
        responseFields={[
          { field: 'nodes', type: 'GraphNode[]', description: 'Nodes with id, label, node_type, and arbitrary properties' },
          { field: 'learning_metrics', type: 'object', description: 'Total events, unique contexts, learned patterns, success rate, edge weights' },
          { field: 'modularity', type: 'number', description: 'Graph modularity score indicating community structure' },
        ]}
      />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-200">Graph Visualization</h1>
          <p className="text-sm text-gray-500">EventGraph structure with analytics</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(NODE_COLORS).filter(([k]) => k !== 'default').map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {type}
            </div>
          ))}
        </div>
      </div>

      {/* Analytics: Graph Stats */}
      {analytics && (
        <>
          <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Graph Analytics</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <MiniStat label="Nodes" value={analytics.node_count} />
            <MiniStat label="Edges" value={analytics.edge_count} />
            <MiniStat label="Components" value={analytics.connected_components} />
            <MiniStat label="Largest Component" value={analytics.largest_component_size} />
            <MiniStat label="Avg Path Length" value={analytics.average_path_length?.toFixed(2) ?? '-'} />
            <MiniStat label="Diameter" value={analytics.diameter} />
            <MiniStat label="Avg Clustering" value={analytics.average_clustering?.toFixed(3) ?? '-'} />
            <MiniStat label="Modularity" value={analytics.modularity?.toFixed(3) ?? '-'} />
            <MiniStat label="Communities" value={analytics.community_count} />
            <MiniStat label="Clustering Coeff" value={analytics.clustering_coefficient.toFixed(3)} />
          </div>

          {/* Learning Metrics */}
          {analytics.learning_metrics && (
            <>
              <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Learning Metrics</div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                <MiniStat label="Total Events" value={analytics.learning_metrics.total_events} />
                <MiniStat label="Unique Contexts" value={analytics.learning_metrics.unique_contexts} />
                <MiniStat label="Learned Patterns" value={analytics.learning_metrics.learned_patterns} />
                <MiniStat label="Strong Memories" value={analytics.learning_metrics.strong_memories} />
                <MiniStat label="Success Rate" value={`${(analytics.learning_metrics.overall_success_rate * 100).toFixed(1)}%`} />
                <MiniStat label="Avg Edge Weight" value={analytics.learning_metrics.average_edge_weight?.toFixed(2) ?? '-'} />
              </div>
            </>
          )}
        </>
      )}

      <div className="flex-1 relative bg-surface-1 rounded-xl border border-surface-4 overflow-hidden">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-crosshair"
          />
        )}
        {selected && (
          <div className="absolute bottom-4 left-4 bg-surface-2 border border-surface-4 rounded-lg p-3 max-w-sm">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="brand">{selected.node_type}</Badge>
              <span className="text-xs text-gray-400">#{selected.id}</span>
            </div>
            <p className="text-sm text-gray-200">{selected.label}</p>
            {selected.properties && Object.keys(selected.properties).length > 0 && (
              <pre className="mt-2 text-xs text-gray-400 overflow-auto max-h-24">
                {JSON.stringify(selected.properties, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface-2 rounded-lg p-2 text-center">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-sm font-semibold text-gray-200">{value}</div>
    </div>
  );
}
