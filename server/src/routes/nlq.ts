import { Router } from 'express';
import { client } from '../minns/client.js';
import { MinnsError } from 'minns-sdk';

const router = Router();

router.post('/nlq', async (req, res) => {
  try {
    const { question, session_id, limit, offset } = req.body;
    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'question is required' });
      return;
    }
    const result = await client.nlq({
      question,
      session_id,
      limit,
      offset,
    });
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      const status = err.statusCode ?? 500;
      const msg = status === 502 ? 'MINNS API is temporarily unavailable — please try again'
        : err.message;
      res.status(status).json({ error: msg, details: err.details });
    } else {
      res.status(500).json({ error: 'NLQ query failed' });
    }
  }
});

export default router;
