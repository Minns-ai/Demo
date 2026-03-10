import { Router } from 'express';
import { client, getTelemetryLog, reinitClient } from '../minns/client.js';
import { reinitLLM } from '../agent/llm.js';
import { MinnsError } from 'minns-sdk';
import { config, updateConfig } from '../config.js';

const router = Router();

function isRealKey(key: string | undefined): boolean {
  if (!key || key.trim().length === 0) return false;
  const lower = key.toLowerCase();
  // Catch any placeholder-style values
  if (lower.includes('your_') || lower.includes('_here') || lower === 'changeme' || lower === 'xxx') return false;
  return true;
}

router.get('/config/status', (_req, res) => {
  const minnsOk = isRealKey(config.minnsApiKey);
  const openaiOk = isRealKey(config.openaiApiKey);
  const anthropicOk = isRealKey(config.anthropicApiKey);

  res.json({
    minns_configured: minnsOk,
    openai_configured: openaiOk,
    anthropic_configured: anthropicOk,
    // Only need MINNS + at least one LLM provider
    has_llm: openaiOk || anthropicOk,
    default_provider: config.defaultProvider,
  });
});

/**
 * Save API keys from the frontend UI.
 * Persists to .env and hot-reloads all clients — no restart needed.
 */
router.post('/config/keys', async (req, res) => {
  const { minns_api_key, openai_api_key, anthropic_api_key, llm_provider } = req.body;

  // Validate: need MINNS key + at least one LLM key
  if (!minns_api_key) {
    res.status(400).json({ error: 'MINNS API key is required' });
    return;
  }
  if (!openai_api_key && !anthropic_api_key) {
    res.status(400).json({ error: 'At least one LLM provider key is required (OpenAI or Anthropic)' });
    return;
  }

  // Determine provider
  let provider: 'openai' | 'anthropic' = llm_provider || 'openai';
  if (provider === 'openai' && !openai_api_key) provider = 'anthropic';
  if (provider === 'anthropic' && !anthropic_api_key) provider = 'openai';

  try {
    // Persist to .env and update in-memory config
    updateConfig({
      minnsApiKey: minns_api_key,
      openaiApiKey: openai_api_key || '',
      anthropicApiKey: anthropic_api_key || '',
      defaultProvider: provider,
    });

    // Hot-reload clients
    await reinitClient();
    reinitLLM();

    console.log(`[config] Keys updated via UI — provider: ${provider}`);

    res.json({
      success: true,
      minns_configured: true,
      openai_configured: !!openai_api_key,
      anthropic_configured: !!anthropic_api_key,
      default_provider: provider,
    });
  } catch (err: any) {
    console.error('[config] Failed to save keys:', err);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

router.get('/health', async (_req, res) => {
  try {
    const health = await client.healthCheck();
    res.json(health);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      console.error(`[minns:health] healthCheck failed: ${err.message} [${err.statusCode}]`, err.details);
    }
    res.json({
      status: 'degraded',
      version: 'unknown',
      uptime_seconds: 0,
      is_healthy: false,
      node_count: 0,
      edge_count: 0,
      processing_rate: 0,
    });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const stats = await client.getStats();
    res.json(stats);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      console.error(`[minns:health] getStats failed: ${err.message} [${err.statusCode}]`, err.details);
    }
    res.json({
      total_events_processed: 0, total_nodes_created: 0,
      total_episodes_detected: 0, total_memories_formed: 0,
      total_strategies_extracted: 0, total_reinforcements_applied: 0,
      average_processing_time_ms: 0,
      stores: {
        memories: { total: 0, avg_strength: 0, avg_access_count: 0, agents_with_memories: 0 },
        strategies: { total: 0, high_quality: 0, avg_quality: 0, agents_with_strategies: 0 },
        claims: { total: 0, embeddings_indexed: 0 },
        graph: { nodes: 0, edges: 0, avg_degree: 0, largest_component: 0 },
      },
    });
  }
});

router.get('/telemetry', (_req, res) => {
  res.json(getTelemetryLog());
});

export default router;
