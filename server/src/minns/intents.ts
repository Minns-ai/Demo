import type { IntentSpec, ParsedSidecarIntent } from 'minns-sdk';

/** Always enable semantic processing — every interaction should produce claims. */
const enableSemanticHook = (_parsed: ParsedSidecarIntent) => true;

export const orderTrackingSpec: IntentSpec = {
  domain: 'order_tracking',
  fallback_intent: 'query',
  intents: [
    { name: 'track_order', slots: { order_id: { type: "string" } } },
    { name: 'order_status', slots: { order_id: { type: "string" } } },
    { name: 'delivery_estimate', slots: { order_id: { type: "string", optional: true } } },
    { name: 'query' },
  ],
  extensions: { allow_goal_updates: true, allow_claims_hint: true, allowed_claim_types: ['preference', 'constraint'] },
  enableSemantic: enableSemanticHook,
};

export const returnsSpec: IntentSpec = {
  domain: 'returns_refunds',
  fallback_intent: 'query',
  intents: [
    { name: 'initiate_return', slots: { order_id: { type: "string" }, reason: { type: "string", optional: true } } },
    { name: 'refund_status', slots: { order_id: { type: "string", optional: true } } },
    { name: 'exchange', slots: { order_id: { type: "string" }, new_product_id: { type: "string", optional: true } } },
    { name: 'query' },
  ],
  extensions: { allow_goal_updates: true, allow_claims_hint: true, allowed_claim_types: ['complaint', 'preference'] },
  enableSemantic: enableSemanticHook,
};

export const productsSpec: IntentSpec = {
  domain: 'products',
  fallback_intent: 'query',
  intents: [
    { name: 'product_info', slots: { product_id: { type: "string", optional: true }, query: { type: "string", optional: true } } },
    { name: 'availability', slots: { product_id: { type: "string" } } },
    { name: 'recommend', slots: { category: { type: "string", optional: true } } },
    { name: 'query' },
  ],
  extensions: { allow_claims_hint: true, allowed_claim_types: ['preference'] },
  enableSemantic: enableSemanticHook,
};

export const complaintsSpec: IntentSpec = {
  domain: 'complaints',
  fallback_intent: 'query',
  intents: [
    { name: 'file_complaint', slots: { subject: { type: "string" }, order_id: { type: "string", optional: true } } },
    { name: 'escalate', slots: { complaint_id: { type: "string", optional: true } } },
    { name: 'feedback', slots: { rating: { enum: ['1', '2', '3', '4', '5'], optional: true }, comment: { type: "string", optional: true } } },
    { name: 'query' },
  ],
  extensions: { allow_goal_updates: true, allow_claims_hint: true, allowed_claim_types: ['complaint', 'constraint'] },
  enableSemantic: enableSemanticHook,
};

export const accountSpec: IntentSpec = {
  domain: 'account',
  fallback_intent: 'query',
  intents: [
    { name: 'update_profile', slots: { field: { type: "string" }, value: { type: "string" } } },
    { name: 'reset_password' },
    { name: 'account_info' },
    { name: 'query' },
  ],
  extensions: { allow_claims_hint: true, allowed_claim_types: ['preference'] },
  enableSemantic: enableSemanticHook,
};

export const allSpecs = [orderTrackingSpec, returnsSpec, productsSpec, complaintsSpec, accountSpec];
