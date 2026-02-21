import { client } from '../minns/client.js';
import { config } from '../config.js';
import type { EventBuilderConfig, ProcessEventResponse, LocalAck } from 'minns-sdk';
import { AGENT_TYPE } from '../minns/registry.js';

function builderConfig(overrides: Partial<EventBuilderConfig> = {}): EventBuilderConfig {
  return {
    agentId: config.agentId,
    sessionId: config.sessionId,
    ...overrides,
  };
}

// ── Communication events ────────────────────────────────────────────

export async function emitUserMessage(
  message: string,
  goalDesc?: string,
  goalProgress?: number,
  causedBy?: string
): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .communication('user_message', 0, config.agentId, { text: message })
    .state({ turn: 'user', timestamp: Date.now() });
  if (goalDesc) b.goal(goalDesc, 3, goalProgress ?? 0);
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

export async function emitAgentMessage(
  message: string,
  intent: string,
  goalDesc?: string,
  goalProgress?: number,
  causedBy?: string
): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .communication('agent_response', config.agentId, 0, { text: message, intent })
    .state({ turn: 'agent', intent, timestamp: Date.now() });
  if (goalDesc) b.goal(goalDesc, 3, goalProgress ?? 0.5);
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

// ── Cognitive events ────────────────────────────────────────────────

export async function emitReasoning(
  input: unknown,
  output: unknown,
  trace: string[],
  causedBy?: string
): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .cognitive('Reasoning', input, output, trace);
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

export async function emitPlanning(
  input: unknown,
  output: unknown,
  trace: string[],
  causedBy?: string
): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .cognitive('Planning', input, output, trace);
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

// ── Action events ───────────────────────────────────────────────────

export async function emitAction(
  actionName: string,
  params: Record<string, unknown>,
  result: unknown,
  goalDesc?: string,
  goalProgress?: number,
  causedBy?: string
): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .action(actionName, params)
    .outcome(result)
    .state({ action: actionName, timestamp: Date.now() });
  if (goalDesc) b.goal(goalDesc, 3, goalProgress ?? 0.5);
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

// ── Observation events ──────────────────────────────────────────────

export async function emitObservation(
  type: string,
  data: unknown,
  opts: { confidence?: number; source?: string } = {},
  causedBy?: string
): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .observation(type, data, opts);
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

// ── Context events (semantic claims) ────────────────────────────────

export async function emitContext(
  text: string,
  contextType: string = 'conversation',
  causedBy?: string
): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig({ enableSemantic: true }))
    .context(text, contextType);
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

// ── Learning events ─────────────────────────────────────────────────

export async function emitMemoryRetrieved(queryId: string, memoryIds: (number | string)[], causedBy?: string): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .learning({ MemoryRetrieved: { query_id: queryId, memory_ids: memoryIds } });
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

export async function emitStrategyServed(queryId: string, strategyIds: number[], causedBy?: string): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .learning({ StrategyServed: { query_id: queryId, strategy_ids: strategyIds } });
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

export async function emitOutcome(queryId: string, success: boolean, causedBy?: string): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .learning({ Outcome: { query_id: queryId, success } });
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}
