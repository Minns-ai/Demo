import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import chatRouter from './routes/chat.js';
import memoriesRouter from './routes/memories.js';
import strategiesRouter from './routes/strategies.js';
import claimsRouter from './routes/claims.js';
import analyticsRouter from './routes/analytics.js';
import healthRouter from './routes/health.js';

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

app.listen(config.port, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  minns-sdk Customer Service Agent Demo   ║`);
  console.log(`  ╠══════════════════════════════════════════╣`);
  console.log(`  ║  Server:  http://localhost:${config.port}          ║`);
  console.log(`  ║  API Key: ${config.minnsApiKey ? '✓ configured' : '✗ missing'}              ║`);
  console.log(`  ║  OpenAI:  ${config.openaiApiKey ? '✓ configured' : '✗ missing'}              ║`);
  console.log(`  ║  Agent:   ${config.agentId} (session ${config.sessionId})          ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
