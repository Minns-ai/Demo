import { Router } from 'express';
import { client } from '../minns/client.js';
import { MinnsError } from 'minns-sdk';
import { searchClaims } from '../agent/memory.js';

const router = Router();

router.get('/claims', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const eventId = req.query.eventId ? parseInt(req.query.eventId as string, 10) : undefined;
    const claims = await client.getClaims({ limit, eventId });
    res.json(claims);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to fetch claims' });
    }
  }
});

router.get('/claims/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid claim ID' });
      return;
    }
    const claim = await client.getClaimById(id);
    res.json(claim);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to fetch claim' });
    }
  }
});

router.post('/claims/search', async (req, res) => {
  try {
    const { query_text, top_k } = req.body;
    if (!query_text || typeof query_text !== 'string') {
      res.status(400).json({ error: 'query_text is required' });
      return;
    }
    const results = await searchClaims(query_text, top_k || 10);
    res.json(results);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: (err as Error).message });
    }
  }
});

export default router;
