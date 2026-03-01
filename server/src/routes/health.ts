import { Router } from 'express';
import { client, getTelemetryLog } from '../minns/client.js';
import { MinnsError } from 'minns-sdk';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    const health = await client.healthCheck();
    res.json(health);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      console.error(`[minns:health] healthCheck failed: ${err.message} [${err.statusCode}]`, err.details);
    }
    res.json({
      status: 'degraded',
      version: 'unknown',
      uptime_seconds: 0,
      is_healthy: false,
      node_count: 0,
      edge_count: 0,
      processing_rate: 0,
    });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const stats = await client.getStats();
    res.json(stats);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      console.error(`[minns:health] getStats failed: ${err.message} [${err.statusCode}]`, err.details);
    }
    res.json({
      total_events_processed: 0, total_nodes_created: 0,
      total_episodes_detected: 0, total_memories_formed: 0,
      total_strategies_extracted: 0, total_reinforcements_applied: 0,
      average_processing_time_ms: 0,
      stores: {
        memories: { total: 0, avg_strength: 0, avg_access_count: 0, agents_with_memories: 0 },
        strategies: { total: 0, high_quality: 0, avg_quality: 0, agents_with_strategies: 0 },
        claims: { total: 0, embeddings_indexed: 0 },
        graph: { nodes: 0, edges: 0, avg_degree: 0, largest_component: 0 },
      },
    });
  }
});

router.get('/telemetry', (_req, res) => {
  res.json(getTelemetryLog());
});

export default router;
