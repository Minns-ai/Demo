import { Router } from 'express';
import { client } from '../minns/client.js';
import { MinnsError } from 'minns-sdk';

const router = Router();

router.get('/episodes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const episodes = await client.getEpisodes(limit);
    res.json(episodes);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to fetch episodes' });
    }
  }
});

export default router;
