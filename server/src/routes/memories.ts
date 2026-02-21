import { Router } from 'express';
import { getAgentMemories } from '../agent/memory.js';

const router = Router();

router.get('/memories/:agentId', async (req, res) => {
  try {
    const agentId = parseInt(req.params.agentId, 10);
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const memories = await getAgentMemories(limit);
    res.json(memories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
