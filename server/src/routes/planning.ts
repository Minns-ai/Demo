import { Router } from 'express';
import { client } from '../minns/client.js';
import { MinnsError } from 'minns-sdk';

const router = Router();

router.post('/plan', async (req, res) => {
  try {
    const { goal_description, goal_bucket_id, context_fingerprint, session_id } = req.body;
    if (!goal_description || typeof goal_description !== 'string') {
      res.status(400).json({ error: 'goal_description is required' });
      return;
    }
    const plan = await client.createPlan({
      goal_description,
      goal_bucket_id,
      context_fingerprint,
      session_id,
    });
    res.json(plan);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Planning failed' });
    }
  }
});

router.get('/world-model/stats', async (_req, res) => {
  try {
    const stats = await client.getWorldModelStats();
    res.json(stats);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to fetch world model stats' });
    }
  }
});

// List strategies
router.post('/planning/strategies', async (req, res) => {
  try {
    const { goal_description } = req.body;
    const plan = await client.plan(goal_description || 'general');
    res.json(plan?.strategy_candidates ?? []);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to list strategies' });
    }
  }
});

// List actions
router.post('/planning/actions', async (req, res) => {
  try {
    const { goal_description } = req.body;
    const plan = await client.plan(goal_description || 'general');
    res.json(plan?.action_candidates ?? []);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Failed to list actions' });
    }
  }
});

// Execute plan
router.post('/planning/execute', async (req, res) => {
  try {
    const { goal_description, goal_bucket_id, context_fingerprint, session_id } = req.body;
    if (!goal_description) {
      res.status(400).json({ error: 'goal_description is required' });
      return;
    }
    const plan = await client.createPlan({ goal_description, goal_bucket_id, context_fingerprint, session_id });
    res.json({ plan, status: 'executed' });
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Plan execution failed' });
    }
  }
});

// Validate plan
router.post('/planning/validate', async (req, res) => {
  try {
    const { goal_description } = req.body;
    if (!goal_description) {
      res.status(400).json({ error: 'goal_description is required' });
      return;
    }
    const plan = await client.plan(goal_description);
    const isValid = plan && (plan.strategy_candidates?.length > 0 || plan.action_candidates?.length > 0);
    res.json({ valid: !!isValid, plan });
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      res.status(err.statusCode ?? 500).json({ error: err.message, details: err.details });
    } else {
      res.status(500).json({ error: 'Plan validation failed' });
    }
  }
});

export default router;
