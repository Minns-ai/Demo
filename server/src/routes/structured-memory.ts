import { Router } from 'express';
import { client } from '../minns/client.js';
import { MinnsError } from 'minns-sdk';

const router = Router();

function handleError(err: unknown, res: any, fallback: string) {
  if (err instanceof MinnsError) {
    res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
  } else {
    res.status(500).json({ error: fallback });
  }
}

// Upsert structured memory
router.post('/structured-memory', async (req, res) => {
  try {
    const { key, template } = req.body;
    if (!key || !template) {
      res.status(400).json({ error: 'key and template are required' });
      return;
    }
    const result = await client.upsertStructuredMemory({ key, template });
    res.json(result);
  } catch (err) {
    handleError(err, res, 'Failed to upsert structured memory');
  }
});

// List structured memories
router.get('/structured-memory', async (req, res) => {
  try {
    const prefix = req.query.prefix as string | undefined;
    const result = await client.listStructuredMemory(prefix);
    res.json(result);
  } catch (err) {
    handleError(err, res, 'Failed to list structured memory');
  }
});

// Get structured memory by key
router.get('/structured-memory/:key', async (req, res) => {
  try {
    const result = await client.getStructuredMemory(req.params.key);
    res.json(result);
  } catch (err) {
    handleError(err, res, 'Failed to get structured memory');
  }
});

// Delete structured memory
router.delete('/structured-memory/:key', async (req, res) => {
  try {
    const result = await client.deleteStructuredMemory(req.params.key);
    res.json(result);
  } catch (err) {
    handleError(err, res, 'Failed to delete structured memory');
  }
});

// Append ledger entry
router.post('/structured-memory/:key/ledger', async (req, res) => {
  try {
    const result = await client.appendLedgerEntry(req.params.key, req.body);
    res.json(result);
  } catch (err) {
    handleError(err, res, 'Failed to append ledger entry');
  }
});

// Get ledger balance
router.get('/structured-memory/:key/ledger/balance', async (req, res) => {
  try {
    const result = await client.getLedgerBalance(req.params.key);
    res.json(result);
  } catch (err) {
    handleError(err, res, 'Failed to get ledger balance');
  }
});

// Transition state
router.post('/structured-memory/:key/state', async (req, res) => {
  try {
    const result = await client.transitionState(req.params.key, req.body);
    res.json(result);
  } catch (err) {
    handleError(err, res, 'Failed to transition state');
  }
});

// Get current state
router.get('/structured-memory/:key/state', async (req, res) => {
  try {
    const result = await client.getCurrentState(req.params.key);
    res.json(result);
  } catch (err) {
    handleError(err, res, 'Failed to get current state');
  }
});

// Update preference
router.post('/structured-memory/:key/preference', async (req, res) => {
  try {
    const result = await client.updatePreference(req.params.key, req.body);
    res.json(result);
  } catch (err) {
    handleError(err, res, 'Failed to update preference');
  }
});

// Add tree child
router.post('/structured-memory/:key/tree', async (req, res) => {
  try {
    const result = await client.addTreeChild(req.params.key, req.body);
    res.json(result);
  } catch (err) {
    handleError(err, res, 'Failed to add tree child');
  }
});

export default router;
