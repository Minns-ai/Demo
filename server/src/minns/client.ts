import { MinnsClient, TelemetryData } from 'minns-sdk';
import { config } from '../config.js';

const telemetryLog: TelemetryData[] = [];

function onTelemetry(data: TelemetryData) {
  telemetryLog.push(data);
  if (telemetryLog.length > 200) telemetryLog.shift();
  const tag = data.type === 'error' ? 'ERR' : data.type.toUpperCase();
  const detail = data.path ? ` ${data.method} ${data.path}` : '';
  const ms = data.duration_ms != null ? ` ${data.duration_ms}ms` : '';
  const errMsg = data.type === 'error' && data.error ? ` | ${data.error}` : '';
  const status = data.statusCode ? ` [${data.statusCode}]` : '';
  console.log(`[minns:${tag}]${detail}${ms}${status}${errMsg}`);
}

function createMinnsClient(): MinnsClient {
  return new MinnsClient({
    apiKey: config.minnsApiKey,
    agentId: config.agentId,
    sessionId: config.sessionId,
    autoBatch: false,
    debug: true,
    enableDefaultTelemetry: true,
    enableSemantic: true,
    onTelemetry,
  });
}

export let client = createMinnsClient();

/**
 * Reinitialize the MINNS client with current config values.
 * Called after API keys are updated via the frontend.
 */
export async function reinitClient(): Promise<void> {
  try {
    await client.destroy();
  } catch {
    // ignore — old client may not have been functional
  }
  client = createMinnsClient();
  console.log('[minns] Client reinitialized with updated API key');
}

export function getTelemetryLog() {
  return [...telemetryLog];
}

export async function destroyClient(): Promise<void> {
  await client.destroy();
}
