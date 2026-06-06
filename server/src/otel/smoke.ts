/**
 * End-to-end smoke for the optimisation chain: emit a synthetic agent turn
 * as OTLP spans, close the rollout (cluster -> workflow), ground an eval,
 * and read the workflow back.
 *
 * Run: OPTO_URL=... OPTO_API_KEY=... npx tsx src/otel/smoke.ts
 */
import {
  initOpto,
  withSpan,
  closeRollout,
  recordEval,
  shutdownOpto,
  optoEnabled,
} from './opto.js';
import { config } from '../config.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!optoEnabled()) {
    console.error('Set OPTO_URL and OPTO_API_KEY.');
    process.exit(1);
  }
  initOpto();

  const rolloutId = `smoke-${Date.now()}`;
  console.log('rollout:', rolloutId);

  // Synthetic ReAct turn: recall -> think -> act -> think.
  await withSpan('recall', rolloutId, {}, () => sleep(20));
  await withSpan('llm.think', rolloutId, { 'llm.iteration': 0 }, () => sleep(30));
  await withSpan('tool.track_order', rolloutId, {}, () => sleep(15));
  await withSpan('llm.think', rolloutId, { 'llm.iteration': 1 }, () => sleep(25));

  const closed = await closeRollout(rolloutId);
  console.log('closed:', closed);
  if (!closed) {
    await shutdownOpto();
    process.exit(1);
  }

  await recordEval(closed.trajectory_id, {
    reward: 0.92,
    outcomeRef: `minnsdb://outcome/${rolloutId}`,
    notes: 'smoke: order tracking resolved',
  });
  console.log('eval recorded for trajectory', closed.trajectory_id);

  const res = await fetch(`${config.optoUrl}/api/workflows`, {
    headers: { Authorization: `Bearer ${config.optoApiKey}` },
  });
  console.log('workflows:', await res.text());

  await shutdownOpto();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
