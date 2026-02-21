import { Router } from 'express';
import { searchClaims } from '../agent/memory.js';

const router = Router();

router.post('/claims/search', async (req, res) => {
  try {
    const { query_text, top_k } = req.body;
    if (!query_text || typeof query_text !== 'string') {
      res.status(400).json({ error: 'query_text is required' });
      return;
    }
    const results = await searchClaims(query_text, top_k || 10);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
