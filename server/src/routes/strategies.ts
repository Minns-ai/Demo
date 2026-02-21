import { Router } from 'express';
import { getAgentStrategies } from '../agent/strategy.js';

const router = Router();

router.get('/strategies/:agentId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const strategies = await getAgentStrategies(limit);
    res.json(strategies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
