import { Router } from 'express';
import { client } from '../minns/client.js';
import { MinnsError } from 'minns-sdk';

const router = Router();

router.post('/conversations/ingest', async (req, res) => {
  try {
    const { case_id, sessions, include_assistant_facts } = req.body;
    if (!case_id || !sessions || !Array.isArray(sessions)) {
      res.status(400).json({ error: 'case_id and sessions[] are required' });
      return;
    }
    const result = await client.ingestConversations({
      case_id,
      sessions,
      include_assistant_facts: include_assistant_facts ?? false,
    });
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      const message = err instanceof Error ? err.message : 'Failed to ingest conversations';
      console.error('[conversations/ingest]', message);
      res.status(500).json({ error: message });
    }
  }
});

router.post('/conversations/query', async (req, res) => {
  try {
    const { question, sessionId } = req.body;
    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'question is required' });
      return;
    }
    const result = sessionId
      ? await client.queryConversations({ question, sessionId })
      : await client.queryConversations(question);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      const message = err instanceof Error ? err.message : 'Failed to query conversations';
      console.error('[conversations/query]', message);
      res.status(500).json({ error: message });
    }
  }
});

export default router;
