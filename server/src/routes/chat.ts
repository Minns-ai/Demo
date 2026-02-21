import { Router } from 'express';
import { handleMessage } from '../agent/agent.js';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const { message, customerId } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }
    const result = await handleMessage(message, customerId || 'CUST-100');
    res.json(result);
  } catch (err: any) {
    console.error('[chat] Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
