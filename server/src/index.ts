import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { destroyClient } from './minns/client.js';
import { seedWorkspaceData, scheduleLiveUpdate } from './data/workspace-seed.js';
import chatRouter from './routes/chat.js';
import memoriesRouter from './routes/memories.js';
import strategiesRouter from './routes/strategies.js';
import claimsRouter from './routes/claims.js';
import analyticsRouter from './routes/analytics.js';
import healthRouter from './routes/health.js';
import episodesRouter from './routes/episodes.js';
import searchRouter from './routes/search.js';
import planningRouter from './routes/planning.js';
import conversationsRouter from './routes/conversations.js';
import nlqRouter from './routes/nlq.js';
import structuredMemoryRouter from './routes/structured-memory.js';
import eventsRouter from './routes/events.js';
import adminRouter from './routes/admin.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Mount routes
app.use('/api', chatRouter);
app.use('/api', memoriesRouter);
app.use('/api', strategiesRouter);
app.use('/api', claimsRouter);
app.use('/api', analyticsRouter);
app.use('/api', healthRouter);
app.use('/api', episodesRouter);
app.use('/api', searchRouter);
app.use('/api', planningRouter);
app.use('/api', conversationsRouter);
app.use('/api', nlqRouter);
app.use('/api', structuredMemoryRouter);
app.use('/api', eventsRouter);
app.use('/api', adminRouter);

// Comparison route — the demo's main feature. Side-by-side memory-system
// answers (MinnsDB vs mem0 vs Zep vs naive RAG) on a shared scenario.
// Previously gated behind ENABLE_COMPARISON because mem0ai's barrel import
// crashed on a missing `ollama` package and `runMinns` only knew how to
// reach a local MinnsDB at localhost:3333. Both fixed in comparison.ts and
// package.json (ollama installed as a resolver-satisfying ghost dep; the
// MinnsDB call now authenticates against hosted api.minns.ai). The gate is
// no longer needed — the route is always mounted.
import comparisonRouter from './routes/comparison.js';
app.use('/api', comparisonRouter);

// Serve built React client in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

const server = app.listen(config.port, async () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║        Minns Workspace Demo              ║`);
  console.log(`  ╠══════════════════════════════════════════╣`);
  console.log(`  ║  Server:    http://localhost:${config.port}        ║`);
  console.log(`  ║  MINNS:     ${config.minnsApiKey ? '✓ configured' : '✗ missing'}            ║`);
  console.log(`  ║  Anthropic: ${config.anthropicApiKey ? '✓ configured' : '✗ missing'}            ║`);
  console.log(`  ║  OpenAI:    ${config.openaiApiKey ? '✓ configured' : '✗ missing'}            ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);

  // Workspace seeder is intentionally disabled. It was a leftover from the
  // chat-mode shell and is incompatible with the demo's current purpose
  // (side-by-side memory-system comparison): the comparison ingests its
  // own scenarios on demand into a comparison_* case_id, so workspace
  // history would just pollute the tenant with unrelated data. The seeder
  // also POSTed to a raw `MINNS_URL` with no auth header, which against
  // the hosted tenant produced repeated 502s on /api/conversations/ingest
  // (the control plane's tenant-proxy timeout fired before LLM compaction
  // completed). Set DEMO_ENABLE_SEED=true to opt back in for local dev.
  if (process.env.DEMO_ENABLE_SEED === 'true') {
    try {
      await seedWorkspaceData();
      scheduleLiveUpdate();
    } catch (err) {
      console.warn('[startup] Seed failed (MinnsDB may not be ready):', (err as Error).message);
    }
  }
});

// Graceful shutdown — flush pending events and close the server
async function shutdown(signal: string) {
  console.log(`\n[shutdown] Received ${signal}. Flushing events and closing...`);
  try {
    await destroyClient();
    console.log('[shutdown] Client destroyed — all pending events flushed.');
  } catch (err) {
    console.error('[shutdown] Error destroying client:', err);
  }
  server.close(() => {
    console.log('[shutdown] Server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
