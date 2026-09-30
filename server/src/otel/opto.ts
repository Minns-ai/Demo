/**
 * Optimisation-service telemetry.
 *
 * When OPTO_URL + OPTO_API_KEY are set, each agent turn emits OTLP spans
 * (one per LLM call / tool call) tagged with a stable `minns.rollout_id`,
 * then signals the rollout finished so the service closes + clusters it
 * into a workflow and hands back a trajectory id to ground an eval against.
 *
 * Spans group by `minns.rollout_id`, so they need not share a trace
 * context — each span is emitted independently with the same rollout tag.
 */
import {
  trace,
  SpanStatusCode,
  type Attributes,
} from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { config } from '../config.js';

const ROLLOUT_ATTR = 'minns.rollout_id';
const AGENT_ATTR = 'minns.agent_id';

let provider: NodeTracerProvider | null = null;

export function optoEnabled(): boolean {
  return Boolean(config.optoUrl && config.optoApiKey);
}

/** Stand up the tracer + OTLP exporter. Idempotent and a no-op when the
 *  service is not configured, so callers can always invoke it at boot. */
export function initOpto(): void {
  if (!optoEnabled() || provider) return;
  const exporter = new OTLPTraceExporter({
    url: `${config.optoUrl}/v1/traces`,
    headers: { Authorization: `Bearer ${config.optoApiKey}` },
  });
  // OpenTelemetry 2.x: the resource comes from resourceFromAttributes and span
  // processors are passed in, since addSpanProcessor no longer exists.
  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ 'service.name': config.optoAgentName }),
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  provider.register();
  console.log(`[opto] telemetry on -> ${config.optoUrl}`);
}

function baseAttrs(rolloutId: string, extra: Attributes): Attributes {
  return { [ROLLOUT_ATTR]: rolloutId, [AGENT_ATTR]: config.optoAgentName, ...extra };
}

/** Run `fn` inside a span carrying the rollout + agent tags. Records the
 *  duration and an error status if `fn` throws. Transparent when telemetry
 *  is off. */
export async function withSpan<T>(
  name: string,
  rolloutId: string,
  attrs: Attributes,
  fn: () => Promise<T>,
): Promise<T> {
  if (!provider) return fn();
  const span = trace.getTracer('opto-demo').startSpan(name, {
    attributes: baseAttrs(rolloutId, attrs),
  });
  try {
    const out = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return out;
  } catch (err) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    span.end();
  }
}

/** Emit a point-in-time marker span (a step with no awaited work). */
export function markSpan(name: string, rolloutId: string, attrs: Attributes = {}): void {
  if (!provider) return;
  const span = trace
    .getTracer('opto-demo')
    .startSpan(name, { attributes: baseAttrs(rolloutId, attrs) });
  span.end();
}

async function flush(): Promise<void> {
  if (!provider) return;
  try {
    await provider.forceFlush();
  } catch {
    /* best effort — close still reconciles whatever landed */
  }
}

export interface CloseResult {
  trajectory_id: number;
  workflow_id: number | null;
  status: string;
}

/** Flush pending spans, then tell the service the rollout finished so it
 *  closes + clusters the trajectory. Returns the trajectory id (needed to
 *  ground an eval) or null if anything failed. */
export async function closeRollout(rolloutId: string): Promise<CloseResult | null> {
  if (!optoEnabled()) return null;
  await flush();
  try {
    const res = await fetch(
      `${config.optoUrl}/api/rollouts/${encodeURIComponent(rolloutId)}/close`,
      { method: 'POST', headers: { Authorization: `Bearer ${config.optoApiKey}` } },
    );
    if (!res.ok) {
      console.warn(`[opto] close ${rolloutId} -> ${res.status}`);
      return null;
    }
    return (await res.json()) as CloseResult;
  } catch (err) {
    console.warn(`[opto] close failed: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export interface GroundedEval {
  reward: number;
  outcomeRef?: string;
  outcomeSource?: 'correction' | 'demonstration' | 'observation' | 'implicit' | 'judge';
  notes?: string;
}

/** Attach a grounded eval (reward + MinnsDB outcome ref) to a trajectory. */
export async function recordEval(trajectoryId: number, ev: GroundedEval): Promise<void> {
  if (!optoEnabled()) return;
  try {
    const res = await fetch(`${config.optoUrl}/api/trajectories/${trajectoryId}/evals`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.optoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        outcome_source: ev.outcomeSource ?? 'implicit',
        outcome_ref: ev.outcomeRef,
        reward: ev.reward,
        notes: ev.notes,
      }),
    });
    if (!res.ok) console.warn(`[opto] eval -> ${res.status}`);
  } catch (err) {
    console.warn(`[opto] eval failed: ${err instanceof Error ? err.message : err}`);
  }
}

export async function shutdownOpto(): Promise<void> {
  if (!provider) return;
  try {
    await provider.shutdown();
  } catch {
    /* noop */
  }
}
