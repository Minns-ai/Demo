import type { IntentSpec, ParsedSidecarIntent } from 'minns-sdk';

const semanticWhenClaims = (parsed: ParsedSidecarIntent) =>
  !!(parsed.claims_hint && parsed.claims_hint.length > 0);

export const orderTrackingSpec: IntentSpec = {
  domain: 'order_tracking',
  fallback_intent: 'query',
  intents: [
    { name: 'track_order', slots: { order_id: { freeText: true } } },
    { name: 'order_status', slots: { order_id: { freeText: true } } },
    { name: 'delivery_estimate', slots: { order_id: { freeText: true, optional: true } } },
    { name: 'query' },
  ],
  extensions: { allow_goal_updates: true, allow_claims_hint: true, allowed_claim_types: ['preference', 'constraint'] },
  enableSemantic: semanticWhenClaims,
};

export const returnsSpec: IntentSpec = {
  domain: 'returns_refunds',
  fallback_intent: 'query',
  intents: [
    { name: 'initiate_return', slots: { order_id: { freeText: true }, reason: { freeText: true, optional: true } } },
    { name: 'refund_status', slots: { order_id: { freeText: true, optional: true } } },
    { name: 'exchange', slots: { order_id: { freeText: true }, new_product_id: { freeText: true, optional: true } } },
    { name: 'query' },
  ],
  extensions: { allow_goal_updates: true, allow_claims_hint: true, allowed_claim_types: ['complaint', 'preference'] },
  enableSemantic: semanticWhenClaims,
};

export const productsSpec: IntentSpec = {
  domain: 'products',
  fallback_intent: 'query',
  intents: [
    { name: 'product_info', slots: { product_id: { freeText: true, optional: true }, query: { freeText: true, optional: true } } },
    { name: 'availability', slots: { product_id: { freeText: true } } },
    { name: 'recommend', slots: { category: { freeText: true, optional: true } } },
    { name: 'query' },
  ],
  extensions: { allow_claims_hint: true, allowed_claim_types: ['preference'] },
  enableSemantic: semanticWhenClaims,
};

export const complaintsSpec: IntentSpec = {
  domain: 'complaints',
  fallback_intent: 'query',
  intents: [
    { name: 'file_complaint', slots: { subject: { freeText: true }, order_id: { freeText: true, optional: true } } },
    { name: 'escalate', slots: { complaint_id: { freeText: true, optional: true } } },
    { name: 'feedback', slots: { rating: { enum: ['1', '2', '3', '4', '5'], optional: true }, comment: { freeText: true, optional: true } } },
    { name: 'query' },
  ],
  extensions: { allow_goal_updates: true, allow_claims_hint: true, allowed_claim_types: ['complaint', 'constraint'] },
  enableSemantic: semanticWhenClaims,
};

export const accountSpec: IntentSpec = {
  domain: 'account',
  fallback_intent: 'query',
  intents: [
    { name: 'update_profile', slots: { field: { freeText: true }, value: { freeText: true } } },
    { name: 'reset_password' },
    { name: 'account_info' },
    { name: 'query' },
  ],
  extensions: { allow_claims_hint: true, allowed_claim_types: ['preference'] },
  enableSemantic: semanticWhenClaims,
};

export const allSpecs = [orderTrackingSpec, returnsSpec, productsSpec, complaintsSpec, accountSpec];
