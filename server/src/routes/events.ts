import { Router } from 'express';
import { client } from '../minns/client.js';
import { MinnsError } from 'minns-sdk';

const router = Router();

router.get('/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await client.getEvents(limit);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }
});

export default router;
