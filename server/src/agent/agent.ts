import OpenAI from 'openai';
import { extractIntentAndResponse } from 'minns-sdk';
import type { ParsedSidecarIntent, MemoryResponse, StrategyResponse, ClaimSearchResponse } from 'minns-sdk';
import { config } from '../config.js';
import { client } from '../minns/client.js';
import { registry, AGENT_TYPE } from '../minns/registry.js';
import { buildSystemPrompt } from './prompts.js';
import { getAgentMemories, getContextMemories, searchClaims, buildEventContext } from './memory.js';
import { getAgentStrategies, getSimilarStrategies, getActionSuggestions } from './strategy.js';
import * as events from './events.js';
import { handleOrderTracking } from '../handlers/order-tracking.js';
import { handleReturns } from '../handlers/returns.js';
import { handleProducts } from '../handlers/products.js';
import { handleComplaints } from '../handlers/complaints.js';
import { handleAccount } from '../handlers/account.js';
import type { HandlerResult } from '../handlers/order-tracking.js';

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export interface AgentResponse {
  reply: string;
  intent: ParsedSidecarIntent;
  handlerResult: HandlerResult | null;
  debug: {
    memoriesRecalled: MemoryResponse[];
    strategiesConsulted: StrategyResponse[];
    claimsFound: ClaimSearchResponse[];
    actionSuggestions: unknown[];
    eventsEmitted: string[];
    goalDesc: string | null;
    goalProgress: number;
  };
}

// Conversation history for multi-turn context
const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];

export async function handleMessage(
  message: string,
  customerId: string = 'CUST-100'
): Promise<AgentResponse> {
  const queryId = `q-${Date.now()}`;
  const eventsEmitted: string[] = [];
  let goalDesc: string | null = null;
  let goalProgress = 0;

  // ── 1. Recall ──────────────────────────────────────────────────────
  const ctx = buildEventContext({ customerId, lastMessage: message });
  const [memories, contextMems, claims] = await Promise.all([
    getAgentMemories(10),
    getContextMemories(ctx, 5),
    searchClaims(message, 5),
  ]);
  const allMemories = dedup(memories, contextMems);

  if (allMemories.length > 0) {
    await events.emitMemoryRetrieved(queryId, allMemories.map(m => String(m.id)));
    eventsEmitted.push('Learning:MemoryRetrieved');
  }

  // ── 2. Strategize ─────────────────────────────────────────────────
  const [strategies, similarStrats, actionSugg] = await Promise.all([
    getAgentStrategies(5),
    getSimilarStrategies(),
    getActionSuggestions(0, 5),
  ]);

  if (strategies.length > 0) {
    await events.emitStrategyServed(queryId, strategies.map(s => s.id));
    eventsEmitted.push('Learning:StrategyServed');
  }

  // ── 3. Resolve intent spec ────────────────────────────────────────
  // Detect likely goal from message keywords
  goalDesc = detectGoal(message);
  const activeGoals = goalDesc ? [{ description: goalDesc }] : [];
  const spec = registry.resolve(AGENT_TYPE, activeGoals);

  // ── 4. Build prompt ───────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt({
    memories: allMemories,
    strategies: [...strategies, ...similarStrats],
    claims,
    spec,
    customerName: 'Alice Chen',
    customerId,
  });

  // ── 5. Emit user communication event ──────────────────────────────
  const userEventResp = await events.emitUserMessage(message, goalDesc ?? undefined, goalProgress);
  eventsEmitted.push('Communication:user_message');
  const parentEventId = (userEventResp as any).eventId || String(Date.now());

  // ── 6. LLM call ──────────────────────────────────────────────────
  conversationHistory.push({ role: 'user', content: message });

  let llmOutput: string;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10),
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });
    llmOutput = completion.choices[0]?.message?.content ?? '';
  } catch (err: any) {
    // Fallback when OpenAI is unavailable
    llmOutput = buildFallbackResponse(message, spec);
  }

  // ── 7. Parse intent ───────────────────────────────────────────────
  let parsedIntent: ParsedSidecarIntent;
  let assistantResponse: string;

  if (spec) {
    const result = extractIntentAndResponse(llmOutput, message, spec);
    parsedIntent = result.intent;
    assistantResponse = result.assistantResponse;
  } else {
    parsedIntent = { intent: 'query', slots: {}, raw_message: message, enable_semantic: false };
    assistantResponse = llmOutput;
  }

  // ── 8. Emit cognitive event ───────────────────────────────────────
  await events.emitReasoning(
    { userMessage: message, memoriesCount: allMemories.length, strategiesCount: strategies.length },
    { intent: parsedIntent.intent, slots: parsedIntent.slots, confidence: parsedIntent.confidence },
    ['Recalled memories', 'Consulted strategies', 'Resolved intent spec', 'Called LLM', `Parsed intent: ${parsedIntent.intent}`],
    parentEventId
  );
  eventsEmitted.push('Cognitive:Reasoning');

  // ── 9. Dispatch to handler ────────────────────────────────────────
  let handlerResult: HandlerResult | null = null;
  const domain = spec?.domain;

  switch (domain) {
    case 'order_tracking':
      handlerResult = handleOrderTracking(parsedIntent, customerId);
      break;
    case 'returns_refunds':
      handlerResult = handleReturns(parsedIntent, customerId);
      break;
    case 'products':
      handlerResult = handleProducts(parsedIntent);
      break;
    case 'complaints':
      handlerResult = handleComplaints(parsedIntent);
      break;
    case 'account':
      handlerResult = handleAccount(parsedIntent, customerId);
      break;
  }

  // If handler produced data, use handler response; otherwise use LLM response
  const finalReply = handlerResult?.response ?? assistantResponse;
  goalProgress = handlerResult ? 0.8 : 0.3;

  // ── 10. Emit action event from handler ────────────────────────────
  if (handlerResult) {
    await events.emitAction(
      parsedIntent.intent,
      parsedIntent.slots,
      handlerResult.data ?? handlerResult.response,
      goalDesc ?? undefined,
      goalProgress,
      parentEventId
    );
    eventsEmitted.push(`Action:${parsedIntent.intent}`);

    if (handlerResult.observationType && handlerResult.data) {
      await events.emitObservation(
        handlerResult.observationType,
        handlerResult.data,
        { confidence: 1.0, source: 'mock_database' },
        parentEventId
      );
      eventsEmitted.push(`Observation:${handlerResult.observationType}`);
    }
  }

  // ── 11. Emit agent response communication event ───────────────────
  await events.emitAgentMessage(finalReply, parsedIntent.intent, goalDesc ?? undefined, goalProgress, parentEventId);
  eventsEmitted.push('Communication:agent_response');

  // ── 12. Context event for semantic claims ─────────────────────────
  if (parsedIntent.enable_semantic || (parsedIntent.claims_hint && parsedIntent.claims_hint.length > 0)) {
    const claimTexts = parsedIntent.claims_hint?.map(c => c.text).join('. ') ?? message;
    await events.emitContext(claimTexts, 'conversation', parentEventId);
    eventsEmitted.push('Context:semantic_claims');
  }

  // ── 13. Emit outcome learning event ───────────────────────────────
  await events.emitOutcome(queryId, !!handlerResult, parentEventId);
  eventsEmitted.push('Learning:Outcome');

  // ── 14. Flush batched events ──────────────────────────────────────
  await client.flush();
  eventsEmitted.push('BatchFlush');

  conversationHistory.push({ role: 'assistant', content: finalReply });

  return {
    reply: finalReply,
    intent: parsedIntent,
    handlerResult,
    debug: {
      memoriesRecalled: allMemories,
      strategiesConsulted: [...strategies, ...similarStrats],
      claimsFound: claims,
      actionSuggestions: actionSugg,
      eventsEmitted,
      goalDesc,
      goalProgress,
    },
  };
}

function dedup(a: MemoryResponse[], b: MemoryResponse[]): MemoryResponse[] {
  const seen = new Set(a.map(m => String(m.id)));
  const result = [...a];
  for (const m of b) {
    if (!seen.has(String(m.id))) {
      seen.add(String(m.id));
      result.push(m);
    }
  }
  return result;
}

function detectGoal(message: string): string | null {
  const lower = message.toLowerCase();
  if (/order|track|deliver|ship/i.test(lower)) return 'track_order';
  if (/return|refund|exchange/i.test(lower)) return 'handle_return';
  if (/product|item|recommend|catalog|stock/i.test(lower)) return 'product_inquiry';
  if (/complain|issue|problem|escalate|feedback/i.test(lower)) return 'handle_complaint';
  if (/account|profile|password|email|setting/i.test(lower)) return 'account_help';
  return null;
}

function buildFallbackResponse(message: string, spec: any): string {
  const goal = detectGoal(message);
  const intentBlock = `BEGIN_INTENT_JSON\n{"intent":"query","slots":{},"context":"${message.replace(/"/g, '\\"').slice(0, 200)}","confidence":0.5}\nEND_INTENT_JSON\n`;
  const responseBlock = `BEGIN_ASSISTANT_RESPONSE\nI'd be happy to help you! I'm currently operating in offline mode, but I can still assist with order tracking, returns, product inquiries, complaints, and account management. Could you tell me more about what you need?\nEND_ASSISTANT_RESPONSE`;
  return intentBlock + responseBlock;
}
