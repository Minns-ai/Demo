import { Router } from 'express';
import { handleMessage, getCustomerTurn } from '../agent/agent.js';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const { message, customerId, provider } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const sse = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const queryId = await handleMessage(message, customerId || 'CUST-100', sse, provider);

    // Send the queryId so the client can reconnect if needed
    res.write(`event: queryId\ndata: ${JSON.stringify({ queryId })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('[chat] Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * Reconnect endpoint — retrieves the result of an in-flight or recently
 * completed turn. Clients call this after an SSE disconnect to get the
 * steps they missed instead of re-sending the message and creating a
 * duplicate MINNS episode.
 */
router.get('/chat/turn/:customerId', (req, res) => {
  const turn = getCustomerTurn(req.params.customerId);
  if (!turn) {
    res.status(404).json({ error: 'No active or recent turn found' });
    return;
  }
  res.json({
    queryId: turn.queryId,
    status: turn.status,
    steps: turn.steps,
    startedAt: turn.startedAt,
    completedAt: turn.completedAt ?? null,
  });
});

export default router;
