import { IntentSpecRegistry } from 'minns-sdk';
import type { IntentSpec } from 'minns-sdk';
import { orderTrackingSpec, returnsSpec, productsSpec, complaintsSpec, accountSpec } from './intents.js';

export const AGENT_TYPE = 'customer_service';

export const registry = new IntentSpecRegistry();

// Goal → spec associations
const goalSpecs: [string, IntentSpec][] = [
  ['track_order', orderTrackingSpec],
  ['handle_return', returnsSpec],
  ['product_inquiry', productsSpec],
  ['handle_complaint', complaintsSpec],
  ['account_help', accountSpec],
];

for (const [goal, spec] of goalSpecs) {
  registry.registerForGoal(AGENT_TYPE, goal, spec);
}

// Fallback covers general queries
registry.registerAgentFallback(AGENT_TYPE, orderTrackingSpec);

/**
 * Reverse map: intent name → goal description.
 * Built from registered specs so it stays in sync automatically.
 */
export const intentToGoal: Record<string, string> = {};
for (const [goal, spec] of goalSpecs) {
  for (const intent of spec.intents) {
    if (intent.name && intent.name !== spec.fallback_intent) {
      intentToGoal[intent.name] = goal;
    }
  }
}
