import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { destroyClient } from './minns/client.js';
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

const server = app.listen(config.port, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║           minns-sdk Demo                 ║`);
  console.log(`  ╠══════════════════════════════════════════╣`);
  console.log(`  ║  Server:    http://localhost:${config.port}        ║`);
  console.log(`  ║  MINNS:     ${config.minnsApiKey ? '✓ configured' : '✗ missing'}            ║`);
  console.log(`  ║  OpenAI:    ${config.openaiApiKey ? '✓ configured' : '✗ missing'}            ║`);
  console.log(`  ║  Anthropic: ${config.anthropicApiKey ? '✓ configured' : '✗ missing'}            ║`);
  console.log(`  ║  Default:   ${config.defaultProvider.padEnd(20)}║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
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
