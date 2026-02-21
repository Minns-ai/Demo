import { EventGraphDBClient, TelemetryData } from 'minns-sdk';
import { config } from '../config.js';

const telemetryLog: TelemetryData[] = [];

function onTelemetry(data: TelemetryData) {
  telemetryLog.push(data);
  if (telemetryLog.length > 200) telemetryLog.shift();
  const tag = data.type === 'error' ? 'ERR' : data.type.toUpperCase();
  const detail = data.path ? ` ${data.method} ${data.path}` : '';
  const ms = data.duration_ms != null ? ` ${data.duration_ms}ms` : '';
  console.log(`[minns:${tag}]${detail}${ms}`);
}

export const client = new EventGraphDBClient({
  apiKey: config.minnsApiKey,
  autoBatch: true,
  batchMaxSize: 15,
  batchInterval: 200,
  debug: false,
  onTelemetry,
});

export function getTelemetryLog() {
  return [...telemetryLog];
}
