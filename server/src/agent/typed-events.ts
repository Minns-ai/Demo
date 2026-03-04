import { client } from '../minns/client.js';
import { config } from '../config.js';
import { AGENT_TYPE } from '../minns/registry.js';

/**
 * Emit a typed StateChangeEvent via the MINNS SDK.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function emitStateChange(
  entity: string,
  newState: string,
  oldState?: string,
  trigger?: string,
  extraMetadata?: Record<string, unknown>
): Promise<void> {
  try {
    await client.sendStateChangeEvent({
      agent_id: config.agentId,
      agent_type: AGENT_TYPE,
      session_id: config.sessionId,
      entity,
      new_state: newState,
      old_state: oldState,
      trigger,
      extra_metadata: extraMetadata as Record<string, any>,
    });
  } catch (err) {
    console.error('[typed-events] StateChangeEvent failed:', err);
  }
}

/**
 * Emit a typed TransactionEvent via the MINNS SDK.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function emitTransaction(
  from: string,
  to: string,
  amount: number,
  direction: 'Credit' | 'Debit',
  description: string,
  extraMetadata?: Record<string, unknown>
): Promise<void> {
  try {
    await client.sendTransactionEvent({
      agent_id: config.agentId,
      agent_type: AGENT_TYPE,
      session_id: config.sessionId,
      from,
      to,
      amount,
      direction,
      description,
      extra_metadata: extraMetadata as Record<string, any>,
    });
  } catch (err) {
    console.error('[typed-events] TransactionEvent failed:', err);
  }
}
