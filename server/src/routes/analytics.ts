import { Router } from 'express';
import { client } from '../minns/client.js';

const router = Router();

router.get('/analytics', async (_req, res) => {
  try {
    const analytics = await client.getAnalytics();
    res.json(analytics);
  } catch (err: any) {
    res.json({
      node_count: 0, edge_count: 0, connected_components: 0,
      largest_component_size: 0, average_path_length: 0, diameter: 0,
      clustering_coefficient: 0, average_clustering: 0, modularity: 0,
      community_count: 0,
      learning_metrics: {
        total_events: 0, unique_contexts: 0, learned_patterns: 0,
        strong_memories: 0, overall_success_rate: 0, average_edge_weight: 0,
      },
    });
  }
});

router.get('/graph', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const graph = await client.getGraph({ limit });
    res.json(graph);
  } catch (err: any) {
    res.json({ nodes: [], edges: [] });
  }
});

router.get('/graph/traverse', async (req, res) => {
  try {
    const start = req.query.start as string;
    const maxDepth = parseInt(req.query.max_depth as string, 10) || 3;
    if (!start) {
      res.status(400).json({ error: 'start parameter is required' });
      return;
    }
    const result = await client.traverseGraph({ start, max_depth: maxDepth });
    res.json(result);
  } catch (err: any) {
    res.json({ nodes: [], edges: [] });
  }
});

export default router;
