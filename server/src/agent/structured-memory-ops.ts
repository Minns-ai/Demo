import { client } from '../minns/client.js';
import type { StructuredMemoryUpsertRequest } from 'minns-sdk';

// ---------------------------------------------------------------------------
// Structured Memory helpers
//
// NOTE: For order/return state tracking we use **typed events** instead
// (`emitStateChange` in typed-events.ts). `sendStateChangeEvent` auto-creates
// and transitions a StateMachine on the MINNS backend — no manual upsert needed.
//
// The helpers below demonstrate the remaining structured memory templates that
// do NOT have a typed-event shortcut: Ledger, PreferenceList, and Tree.
// Each function is fire-and-forget — errors are logged but never propagate.
//
// The backend may require fields (like `entity`) not yet declared in the SDK
// types, so we cast via `as StructuredMemoryUpsertRequest` where needed.
// ---------------------------------------------------------------------------

// ── Ledger ──────────────────────────────────────────────────────────────────
// Explicit example: track refunds as a double-entry ledger between a customer
// and the store. Each entry records an amount, direction (Credit/Debit), and a
// description. The running balance is maintained by MINNS automatically.

/**
 * Append a refund entry to the customer's refund ledger.
 * Creates the ledger on first call (upsert is idempotent).
 */
export async function trackRefund(
  customerId: string,
  orderId: string,
  amount: number,
  description: string
): Promise<void> {
  try {
    const key = `refunds:${customerId}`;
    await client.upsertStructuredMemory({
      key,
      template: {
        Ledger: {
          entity_a: customerId,
          entity_b: 'TechGear',
          entries: [],
          balance: 0,
          provenance: 'Manual',
        },
      },
    } as StructuredMemoryUpsertRequest);
    await client.appendLedgerEntry(key, {
      amount,
      description: `${description} (order: ${orderId})`,
      direction: 'Debit',
    });
  } catch (err) {
    console.error(`[structured-memory] trackRefund(${customerId}, ${orderId}) failed:`, err);
  }
}

// ── PreferenceList ──────────────────────────────────────────────────────────
// Explicit example: track ranked product preferences per customer. Each call
// upserts the list (idempotent) then updates the score for a specific item.

/**
 * Record or update a product preference for a customer.
 */
export async function trackProductPreference(
  customerId: string,
  productName: string,
  score: number
): Promise<void> {
  try {
    const key = `prefs:products:${customerId}`;
    await client.upsertStructuredMemory({
      key,
      template: {
        PreferenceList: {
          entity: customerId,
          category: 'products',
          ranked_items: [],
          provenance: 'Manual',
        },
      },
    } as StructuredMemoryUpsertRequest);
    await client.updatePreference(key, {
      item: productName,
      rank: 1,
      score,
    });
  } catch (err) {
    console.error(`[structured-memory] trackProductPreference(${customerId}, ${productName}) failed:`, err);
  }
}

// ── Tree ────────────────────────────────────────────────────────────────────
// Explicit example: model complaint escalation as a tree. Root node "support"
// branches into escalation levels (level_1 → level_2_senior, etc.).

/**
 * Add an escalation step to the customer's complaint tree.
 */
export async function trackComplaintEscalation(
  parentLevel: string,
  childLevel: string,
  customerId: string
): Promise<void> {
  try {
    const key = `escalation:${customerId}`;
    await client.upsertStructuredMemory({
      key,
      template: {
        Tree: {
          entity: customerId,
          nodes: { support: [] },
          provenance: 'Manual',
        },
      },
    } as StructuredMemoryUpsertRequest);
    await client.addTreeChild(key, {
      parent: parentLevel,
      child: childLevel,
    });
  } catch (err) {
    console.error(`[structured-memory] trackComplaintEscalation(${customerId}) failed:`, err);
  }
}

// ── StateMachine (explicit example) ─────────────────────────────────────────
// Demonstrates direct StateMachine usage via the structured memory API.
// In production, prefer typed events (`emitStateChange`) which auto-manage
// state machines. Use this when you need fine-grained control over the
// initial template or want to track entities outside the event pipeline.

/**
 * Create a state machine and transition it to a new state.
 * Useful for custom workflows not covered by typed events.
 */
export async function trackStateMachine(
  key: string,
  entity: string,
  newState: string,
  trigger: string
): Promise<void> {
  try {
    await client.upsertStructuredMemory({
      key,
      template: {
        StateMachine: {
          entity,
          current_state: 'unknown',
          history: [],
          provenance: 'Manual',
        },
      },
    } as StructuredMemoryUpsertRequest);
    await client.transitionState(key, { new_state: newState, trigger });
  } catch (err) {
    console.error(`[structured-memory] trackStateMachine(${key}, ${newState}) failed:`, err);
  }
}
