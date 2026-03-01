import { Router } from 'express';
import { client } from '../minns/client.js';
import { MinnsError } from 'minns-sdk';

const router = Router();

router.get('/analytics', async (_req, res) => {
  try {
    const analytics = await client.getAnalytics();
    res.json(analytics);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
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
  }
});

router.get('/analytics/communities', async (req, res) => {
  try {
    const algorithm = (req.query.algorithm as string) ?? 'louvain';
    const communities = await client.getCommunities(algorithm as 'louvain' | 'label_propagation');
    res.json(communities);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to detect communities' });
    }
  }
});

router.get('/analytics/centrality', async (_req, res) => {
  try {
    const centrality = await client.getCentrality();
    res.json(centrality);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to compute centrality' });
    }
  }
});

router.get('/analytics/pagerank/:nodeId', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.nodeId, 10);
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const minScore = parseFloat(req.query.minScore as string) || 0.01;
    const ppr = await client.getPersonalizedPageRank(nodeId, { limit, minScore });
    res.json(ppr);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to compute PageRank' });
    }
  }
});

router.get('/analytics/reachability/:nodeId', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.nodeId, 10);
    const maxHops = parseInt(req.query.maxHops as string, 10) || 5;
    const maxResults = parseInt(req.query.maxResults as string, 10) || 100;
    const reachable = await client.getReachability(nodeId, { maxHops, maxResults });
    res.json(reachable);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to compute reachability' });
    }
  }
});

router.get('/analytics/causal-path/:source/:target', async (req, res) => {
  try {
    const source = parseInt(req.params.source, 10);
    const target = parseInt(req.params.target, 10);
    const path = await client.getCausalPath(source, target);
    res.json(path);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to find causal path' });
    }
  }
});

router.get('/analytics/index-stats', async (_req, res) => {
  try {
    const stats = await client.getIndexStats();
    res.json(stats);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to fetch index stats' });
    }
  }
});

router.get('/graph', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const graph = await client.getGraph({ limit });
    res.json(graph);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.json({ nodes: [], edges: [] });
    }
  }
});

router.get('/graph/context', async (req, res) => {
  try {
    const contextHash = req.query.context_hash;
    if (!contextHash) {
      res.status(400).json({ error: 'context_hash parameter is required' });
      return;
    }
    const graph = await client.getGraphByContext({ context_hash: Number(contextHash) });
    res.json(graph);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to fetch graph by context' });
    }
  }
});

router.post('/graph/query', async (req, res) => {
  try {
    const result = await client.queryGraphNodes(req.body);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to query graph nodes' });
    }
  }
});

router.post('/graph/persist', async (_req, res) => {
  try {
    const result = await client.persistGraph();
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to persist graph' });
    }
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
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.json({ nodes: [], edges: [] });
    }
  }
});

export default router;
