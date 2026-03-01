import { Router } from 'express';
import { client } from '../minns/client.js';
import { MinnsError } from 'minns-sdk';

const router = Router();

router.post('/search', async (req, res) => {
  try {
    const { query, mode, limit, fusion_strategy } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'query is required' });
      return;
    }
    const results = await client.search({
      query,
      mode: mode ?? 'Hybrid',
      limit: limit ?? 20,
      fusion_strategy: fusion_strategy ?? 'RRF',
    });
    res.json(results);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Search failed' });
    }
  }
});

export default router;
