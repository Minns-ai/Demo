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
  const b = client.event(AGENT_TYPE, builderConfig({ enableSemantic: true }))
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
  const b = client.event(AGENT_TYPE, builderConfig({ enableSemantic: true }))
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
  success: boolean | undefined,
  goalDesc?: string,
  goalProgress?: number,
  causedBy?: string,
  retry?: { attempt: number; maxRetries: number }
): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig({ enableSemantic: true }))
    .action(actionName, params)
    .state({ action: actionName, timestamp: Date.now() });

  // Outcome: true → outcome, false → failure, undefined → partial
  if (success === true) {
    b.outcome(result);
  } else if (success === false) {
    b.failure(typeof result === 'string' ? result : JSON.stringify(result));
  } else {
    b.partial(result, ['Ambiguous outcome']);
  }

  if (retry) {
    b.retry(retry.attempt, retry.maxRetries);
  }

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
  const b = client.event(AGENT_TYPE, builderConfig({ enableSemantic: true }))
    .observation(type, data, opts);
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

// ── Context events (semantic claims) — fire-and-forget via enqueue ──

export async function emitContext(
  text: string,
  contextType: string = 'conversation',
  causedBy?: string
): Promise<void> {
  const b = client.event(AGENT_TYPE, builderConfig({ enableSemantic: true }))
    .context(text, contextType);
  if (causedBy) b.causedBy(causedBy);
  await b.enqueue();
}

// ── Cognitive helpers for ReAct loop ────────────────────────────────

export async function emitThought(
  thought: string,
  action: string,
  actionInput: Record<string, unknown>,
  iteration: number,
  causedBy?: string
): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .cognitive('Reasoning', { thought, iteration }, { action, action_input: actionInput }, [
      `Thought: ${thought}`,
      `Decided action: ${action}`,
    ]);
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

export async function emitReflection(
  thought: string,
  decision: 'continue' | 'finish',
  iteration: number,
  causedBy?: string
): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .cognitive('Reasoning', { reflection: thought, iteration }, { decision }, [
      `Reflection: ${thought}`,
      `Decision: ${decision}`,
    ]);
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

export async function emitMemoryUsed(queryId: string, memoryId: number | string, causedBy?: string): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .learning({ MemoryUsed: { query_id: queryId, memory_id: memoryId } });
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

export async function emitStrategyServed(queryId: string, strategyIds: number[], causedBy?: string): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .learning({ StrategyServed: { query_id: queryId, strategy_ids: strategyIds } });
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

export async function emitStrategyUsed(queryId: string, strategyId: number, causedBy?: string): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .learning({ StrategyUsed: { query_id: queryId, strategy_id: strategyId } });
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

export async function emitClaimRetrieved(queryId: string, claimIds: (number | string)[], causedBy?: string): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .learning({ ClaimRetrieved: { query_id: queryId, claim_ids: claimIds } });
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

export async function emitClaimUsed(queryId: string, claimId: number | string, causedBy?: string): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig())
    .learning({ ClaimUsed: { query_id: queryId, claim_id: claimId } });
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}

export async function emitOutcome(queryId: string, success: boolean, goalDesc?: string, causedBy?: string): Promise<ProcessEventResponse> {
  const b = client.event(AGENT_TYPE, builderConfig({ enableSemantic: true }))
    .learning({ Outcome: { query_id: queryId, success } });
  if (goalDesc) b.goal(goalDesc, 3, 1.0);
  if (causedBy) b.causedBy(causedBy);
  return b.send();
}
