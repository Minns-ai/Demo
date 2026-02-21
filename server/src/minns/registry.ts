import { IntentSpecRegistry } from 'minns-sdk';
import { orderTrackingSpec, returnsSpec, productsSpec, complaintsSpec, accountSpec } from './intents.js';

export const AGENT_TYPE = 'customer_service';

export const registry = new IntentSpecRegistry();

// Register each domain with a goal description
registry.registerForGoal(AGENT_TYPE, 'track_order', orderTrackingSpec);
registry.registerForGoal(AGENT_TYPE, 'handle_return', returnsSpec);
registry.registerForGoal(AGENT_TYPE, 'product_inquiry', productsSpec);
registry.registerForGoal(AGENT_TYPE, 'handle_complaint', complaintsSpec);
registry.registerForGoal(AGENT_TYPE, 'account_help', accountSpec);

// Fallback covers general queries
registry.registerAgentFallback(AGENT_TYPE, orderTrackingSpec);
