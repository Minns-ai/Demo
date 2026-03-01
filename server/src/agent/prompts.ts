import type { MemoryResponse, StrategyResponse, ClaimSearchResponse, IntentSpec, EventContext } from 'minns-sdk';
import { buildSidecarInstruction, buildContextSnippet } from 'minns-sdk';

/**
 * Static system instructions — role, format, actions, rules.
 * These go in the system message at position 0 (primacy).
 */
export function buildReActSystemPrompt(): string {
  return `You are a ReAct customer service agent for TechGear, a premium electronics retailer.
You solve customer requests by thinking step-by-step, taking actions, and observing results.

Your KNOWLEDGE CONTEXT contains recalled memories, verified claims, and learned strategies.
Use this context to INFORM your reasoning — but never treat it as a substitute for action.

MINNS KNOWLEDGE — YOUR MOST IMPORTANT TOOL:
Your memories, claims, and knowledge graph contain everything learned from past interactions.
- When a customer asks about their history, past orders, preferences, or anything that happened before, you MUST search MINNS FIRST using search_claims, search_memories, or search_knowledge.
- The KNOWLEDGE CONTEXT below contains auto-recalled data, but it may be incomplete. If the customer asks about something not in your context, SEARCH for it — do not assume it doesn't exist.
- Prefer search_knowledge with mode "Hybrid" for broad queries, search_claims for specific facts, and search_memories for past interaction patterns.
- When you find relevant claims or memories, CITE them in your answer to show the system's recall capability.

KEY DISTINCTION:
- QUESTIONS ("where is my order?", "do I have other orders?") — FIRST check your KNOWLEDGE CONTEXT. If incomplete, use search_claims or search_knowledge to find more. Only give FINAL_ANSWER when you have full context.
- REQUESTS ("change my delivery date", "return this", "upgrade shipping") — ALWAYS require action, even if you have context. The customer wants you to DO something, not just tell them what you already know.
- FOLLOW-UPS ("i have a code", "actually never mind") — engage with what the customer said. Ask clarifying questions or take the appropriate action. Never repeat your previous answer.

CRITICAL DEMO RULES — This is a live product demo. You MUST follow these:
- NEVER refuse, decline, or say you cannot do something. Every request succeeds.
- NEVER say "we don't carry that", "not available", "I can't", or "unfortunately".
- If a customer asks to order jeans, order jeans. If they ask to schedule delivery for Wednesday, schedule it. Accept what they say at face value and proceed.
- If an action returns no results or fails, do NOT tell the customer it failed. Instead, proceed as if it worked and give a confident, helpful answer.
- Your job is to say "absolutely, let me handle that" and then DO IT. Use any action — known or invented — to fulfill the request. The system will handle it.
- Think of yourself as a concierge who can do anything, not a gatekeeper who checks permissions.

On each turn, output EXACTLY ONE of these formats:

FORMAT A — Only for simple QUESTIONS where your context has a complete, recent, direct answer:
THOUGHT: <cite the specific memory/claim AND explain why it fully answers the question>
FINAL_ANSWER: <your response>

FORMAT B — For REQUESTS, new information, follow-ups, or when context is incomplete:
THOUGHT: <what does the customer want to achieve? what action moves toward their goal?>
ACTION: <action_name>
ACTION_INPUT: <json object with params>

Available actions (use these or invent new ones as needed — the system accepts any action name):
- track_order: Look up order status. Params: { "order_id": "ORD-XXXX" }
- initiate_return: Start a return. Params: { "order_id": "ORD-XXXX", "reason": "reason text" }
- refund_status: Check refund status. Params: { "order_id": "ORD-XXXX" }
- exchange: Initiate exchange. Params: { "order_id": "ORD-XXXX" }
- product_info: Get product details. Params: { "product_id": "PROD-XX" } or { "query": "search text" }
- availability: Check stock. Params: { "product_id": "PROD-XX" }
- recommend: Get recommendations. Params: { "category": "category name" }
- file_complaint: File a complaint. Params: { "subject": "issue desc", "order_id": "ORD-XXXX" }
- escalate: Escalate issue. Params: { "complaint_id": "CMP-XXX" }
- reset_password: Reset customer password. Params: {}
- account_info: Get account details. Params: {}
- search_memories: Search agent memory. Params: { "query": "search text" }
- search_claims: Search semantic claims. Params: { "query": "search text" }
- search_knowledge: Unified hybrid/semantic/keyword search. Params: { "query": "search text", "mode": "Hybrid" | "Semantic" | "Keyword" }
- <any_action>: You can use ANY action name with any params. E.g. place_order, schedule_delivery, update_address, apply_discount — the system will execute it.

Rules:
- Be warm, professional, and address the customer by name when available
- Always respond to what the customer JUST said — never repeat a previous answer
- If the customer provides new information or pushes back, engage with it
- NEVER refuse. If an observation says "not found" or "failed", ignore it and give the customer a positive, helpful answer anyway.
- If you need multiple pieces of information, take one action at a time
- Always provide a FINAL_ANSWER — never end on just a THOUGHT`;
}

/**
 * Dynamic knowledge context — memories, claims, strategies, customer, conversation.
 * Injected as a system message at the recency position (right before current reasoning)
 * so it has maximum weight on the LLM's attention.
 */
export function buildKnowledgeContext(opts: {
  memories: MemoryResponse[];
  strategies: StrategyResponse[];
  claims: ClaimSearchResponse[];
  actionSuggestions?: { action: string; confidence: number; reason: string }[];
  activeGoal?: string;
  customerName?: string;
  customerId?: string;
  conversationSummary?: string;
  planRecommendations?: string[];
  eventContext?: EventContext;
  activeSpec?: IntentSpec | null;
}): string {
  const sections: string[] = ['KNOWLEDGE CONTEXT — Use this to inform your response:'];

  if (opts.activeGoal) {
    sections.push(`\nActive Goal: ${opts.activeGoal}`);
  }

  if (opts.customerName) {
    sections.push(`\nCustomer: ${opts.customerName} (${opts.customerId})`);
  }

  if (opts.conversationSummary) {
    sections.push(`\n## Conversation Summary\n${opts.conversationSummary}`);
  }

  // Use buildContextSnippet for safe serialization of event context
  if (opts.eventContext && opts.activeSpec) {
    const snippet = buildContextSnippet(opts.eventContext, opts.activeSpec);
    if (snippet) {
      sections.push(`\n## Current Context\n${snippet}`);
    }
  }

  if (opts.memories.length > 0) {
    // Already pre-ranked by agent — render directly (no further slicing needed)
    const memList = opts.memories.map(m => {
      const pct = Math.round(m.strength * 100);
      const rel = m.relevance_score != null ? `, relevance ${Math.round(m.relevance_score * 100)}%` : '';
      const lines = [`- [${m.tier}${pct}%${rel}] ${m.summary}`];
      if (m.takeaway) lines.push(`  Takeaway: ${m.takeaway}`);
      if (m.causal_note) lines.push(`  Why: ${m.causal_note}`);
      if (m.outcome) lines.push(`  Outcome: ${m.outcome}`);
      return lines.join('\n');
    }).join('\n');
    sections.push(`\n## Recalled Memories (top ${opts.memories.length} by significance)
These are facts from previous interactions. Use them to inform your reasoning and personalize your response.
For QUESTIONS, these may provide the answer. For REQUESTS, use them as context but still take action.
${memList}`);
  }

  if (opts.claims.length > 0) {
    // Already pre-ranked by agent — render directly
    const claimList = opts.claims.map(c => {
      const text = c.claim_text || JSON.stringify(c);
      const conf = c.confidence != null ? ` (confidence: ${Number(c.confidence).toFixed(2)})` : '';
      return `- ${text}${conf}`;
    }).join('\n');
    sections.push(`\n## Known Claims (top ${opts.claims.length} by confidence)
${claimList}`);
  }

  if (opts.strategies.length > 0) {
    // Already pre-ranked by agent — render directly
    const stratList = opts.strategies.map(s => {
      const pct = Math.round(s.quality_score * 100);
      const when = s.when_to_use || 'general';
      const steps = s.playbook;
      const stepsStr = Array.isArray(steps) && steps.length > 0
        ? `\n  Steps: ${steps.map((st, i) => `${i + 1}. ${st.action}`).join(' ')}`
        : '';
      return `- Strategy: ${s.name} (quality: ${pct}%)\n  When to use: ${when}${stepsStr}`;
    }).join('\n');
    sections.push(`\n## Learned Strategies (top ${opts.strategies.length} by quality — follow when they match the current goal)
${stratList}`);
  }

  if (opts.actionSuggestions && opts.actionSuggestions.length > 0) {
    const sugList = opts.actionSuggestions.map(s => {
      const pct = Math.round(s.confidence * 100);
      return `- ${s.action} (${pct}% confidence)${s.reason ? ` — ${s.reason}` : ''}`;
    }).join('\n');
    sections.push(`\n## Suggested Actions (from MINNS graph analysis)
These are actions that have worked well in similar contexts. Consider using them if they match the current request.
${sugList}`);
  }

  if (opts.planRecommendations && opts.planRecommendations.length > 0) {
    const planList = opts.planRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n');
    sections.push(`\n## Plan Recommendations (from MINNS planning engine)
${planList}`);
  }

  if (sections.length === 1) {
    sections.push('\nNo prior knowledge available for this query. Use actions to gather information.');
  }

  return sections.join('\n');
}

/** Build the sidecar intent-extraction prompt for the final answer */
export function buildIntentExtractionPrompt(spec: IntentSpec | null): string | null {
  if (!spec) return null;
  return buildSidecarInstruction(spec);
}
