import OpenAI from 'openai';
import { extractIntentAndResponse } from 'minns-sdk';
import type { ParsedSidecarIntent, MemoryResponse, StrategyResponse, ClaimSearchResponse } from 'minns-sdk';
import { config } from '../config.js';
import { client } from '../minns/client.js';
import { registry, AGENT_TYPE, intentToGoal } from '../minns/registry.js';
import { allSpecs } from '../minns/intents.js';
import { buildReActSystemPrompt, buildKnowledgeContext, buildIntentExtractionPrompt } from './prompts.js';
import { buildEventContext } from './memory.js';
import { getActionSuggestions } from './strategy.js';
import * as events from './events.js';
import { handleOrderTracking } from '../handlers/order-tracking.js';
import { handleReturns } from '../handlers/returns.js';
import { handleProducts } from '../handlers/products.js';
import { handleComplaints } from '../handlers/complaints.js';
import { handleAccount } from '../handlers/account.js';
import { findCustomer } from '../data/customers.js';
import type { HandlerResult } from '../handlers/order-tracking.js';

const openai = new OpenAI({ apiKey: config.openaiApiKey });

const MAX_ITERATIONS = 5;

export interface StepEvent {
  type: 'recall' | 'think' | 'act' | 'observe' | 'reflect' | 'answer' | 'context' | 'suggest';
  [key: string]: unknown;
}

export type SSEWriter = (event: string, data: unknown) => void;

// Per-customer conversation history (isolated context per customer)
const MAX_HISTORY_PER_CUSTOMER = 20;
const conversationHistories = new Map<string, { role: 'user' | 'assistant'; content: string }[]>();

// Per-customer active goal — persists across turns, can shift mid-conversation
const customerGoals = new Map<string, string>();

function getCustomerGoal(customerId: string): string | undefined {
  return customerGoals.get(customerId);
}

function setCustomerGoal(customerId: string, goal: string | undefined) {
  if (goal) {
    customerGoals.set(customerId, goal);
  } else {
    customerGoals.delete(customerId);
  }
}

function getCustomerHistory(customerId: string): { role: 'user' | 'assistant'; content: string }[] {
  if (!conversationHistories.has(customerId)) {
    conversationHistories.set(customerId, []);
  }
  return conversationHistories.get(customerId)!;
}

function pushToHistory(customerId: string, entry: { role: 'user' | 'assistant'; content: string }) {
  const history = getCustomerHistory(customerId);
  history.push(entry);
  // Prune oldest messages when over the cap
  while (history.length > MAX_HISTORY_PER_CUSTOMER) {
    history.shift();
  }
}

// ── Per-customer turn tracker ───────────────────────────────────────
// Tracks in-flight and recently completed turns so disconnected clients
// can reconnect and retrieve results without creating duplicate episodes.

export interface TurnRecord {
  queryId: string;
  status: 'in_flight' | 'completed' | 'failed';
  steps: StepEvent[];
  startedAt: number;
  completedAt?: number;
}

const TURN_TTL_MS = 5 * 60 * 1000; // keep completed turns for 5 minutes
const customerTurns = new Map<string, TurnRecord>();

/** Get the current or most recent turn for a customer */
export function getCustomerTurn(customerId: string): TurnRecord | undefined {
  const turn = customerTurns.get(customerId);
  if (!turn) return undefined;
  // Expire old completed turns
  if (turn.status !== 'in_flight' && turn.completedAt && Date.now() - turn.completedAt > TURN_TTL_MS) {
    customerTurns.delete(customerId);
    return undefined;
  }
  return turn;
}

/**
 * ReAct agent loop with SSE streaming.
 * Emits step events via the `sse` callback as the agent reasons.
 *
 * Returns the queryId so callers can track this turn.
 */
export async function handleMessage(
  message: string,
  customerId: string = 'CUST-100',
  sse?: SSEWriter
): Promise<string> {
  // If there's already an in-flight turn for this customer, return its queryId
  // so the client can reconnect to it instead of creating a duplicate.
  const existingTurn = customerTurns.get(customerId);
  if (existingTurn?.status === 'in_flight') {
    // Replay accumulated steps to the reconnecting client
    for (const step of existingTurn.steps) {
      sse?.('step', step);
    }
    return existingTurn.queryId;
  }

  const queryId = `q-${Date.now()}`;
  const eventsEmitted: string[] = [];

  // Register the turn
  const turn: TurnRecord = { queryId, status: 'in_flight', steps: [], startedAt: Date.now() };
  customerTurns.set(customerId, turn);

  function sendStep(data: StepEvent) {
    turn.steps.push(data);
    sse?.('step', data);
  }

  // ── Resolve customer ────────────────────────────────────────────
  const customer = findCustomer(customerId);
  const customerName = customer?.name ?? 'Customer';

  // ── Build conversation summary from customer history ────────────
  const customerHistory = getCustomerHistory(customerId);
  let conversationSummary: string | undefined;
  if (customerHistory.length > 0) {
    const turnCount = Math.ceil(customerHistory.length / 2);
    const previousTopics = customerHistory
      .filter(h => h.role === 'user')
      .slice(-5)
      .map(h => h.content.slice(0, 80));
    conversationSummary = `This is turn ${turnCount + 1} of the conversation. Previous topics: ${previousTopics.map(t => `"${t}"`).join(', ')}`;
  }

  // ── Phase 0: INFER GOAL then RECALL ─────────────────────────────────
  // Resolve initial goal: new message inference wins, else carry forward from prior turn
  const previousGoal = getCustomerGoal(customerId);
  let activeGoal = inferGoal(message) ?? previousGoal;

  const ctx = buildEventContext({ customerId, lastMessage: message }, activeGoal);

  // Use recallContext() for parallel fault-tolerant recall of memories, strategies, claims
  const recall = await client.recallContext({
    agentId: config.agentId,
    context: ctx,
    claimsQuery: customerId,
    memoryLimit: 10,
    strategyLimit: 5,
  });

  let topMemories = rankMemories(Array.isArray(recall.memories) ? recall.memories : [], 5);
  let activeStrategies = rankStrategies(Array.isArray(recall.strategies) ? recall.strategies : [], 3);
  let topClaims = rankClaims(Array.isArray(recall.claims) ? recall.claims : [], 5);

  // Fetch action suggestions — MINNS recommends next actions based on graph patterns
  const actionSuggestions = await getActionSuggestions(activeGoal ?? 'general', 3);

  // Call client.plan() for strategy recommendations (advisory only)
  let planRecommendations: string[] = [];
  if (activeGoal) {
    try {
      const planResult = await client.plan(activeGoal);
      if (planResult && planResult.strategy_candidates) {
        planRecommendations = planResult.strategy_candidates
          .slice(0, 3)
          .map(s => s.goal_description || s.decision || String(s));
      }
    } catch {
      // Advisory only — plan failures are silent
    }
  }

  if (topMemories.length > 0) {
    await events.emitMemoryRetrieved(queryId, topMemories.map(m => String(m.id)));
    eventsEmitted.push('Learning:MemoryRetrieved');
  }
  if (activeStrategies.length > 0) {
    await events.emitStrategyServed(queryId, activeStrategies.map(s => s.id));
    eventsEmitted.push('Learning:StrategyServed');
  }
  if (topClaims.length > 0) {
    const claimIds = topClaims.map(c => c.claim_id ?? 0).filter(id => id !== 0).map(id => Number(id));
    if (claimIds.length > 0) {
      await events.emitClaimRetrieved(queryId, claimIds);
      eventsEmitted.push('Learning:ClaimRetrieved');
    }
  }

  sendStep({
    type: 'recall',
    goal: activeGoal ?? 'general',
    previousGoal: previousGoal ?? null,
    memories: topMemories.length,
    strategies: activeStrategies.length,
    claims: topClaims.length,
    suggestions: actionSuggestions.length,
    recall_ms: recall.recall_ms,
  });

  // Show action suggestions as a separate step so they're visible in the UI
  if (actionSuggestions.length > 0) {
    sendStep({
      type: 'suggest',
      suggestions: actionSuggestions.map(s => ({
        action: s.action_name,
        confidence: s.success_probability,
        reason: s.reasoning,
      })),
    } as StepEvent);
    eventsEmitted.push('SDK:ActionSuggestions');
  }

  // ── Emit user communication event with inferred goal ──────────────
  const userEventResp = await events.emitUserMessage(message, activeGoal, 0);
  eventsEmitted.push('Communication:user_message');
  const parentEventId = userEventResp.event_id ?? String(Date.now());

  // Emit semantic context for user message — "constraint" type so the SDK extracts claims about what the user wants/needs
  await events.emitContext(message, 'constraint', parentEventId);
  eventsEmitted.push('Context:user_semantic');
  sendStep({ type: 'context', contextType: 'constraint', text: message.slice(0, 120) });

  // ── Build prompts ────────────────────────────────────────────────
  // Resolve the sidecar instruction so the LLM includes structured intent+claims in its output
  const goalSpec = activeGoal
    ? registry.resolve(AGENT_TYPE, [{ description: activeGoal }])
    : null;
  const fallbackSpec = registry.resolve(AGENT_TYPE, []);
  const activeSpec = goalSpec ?? fallbackSpec ?? null;
  const sidecarInstruction = buildIntentExtractionPrompt(activeSpec);

  const systemPrompt = buildReActSystemPrompt()
    + (sidecarInstruction ? `\n\n${sidecarInstruction}` : '');

  /** Rebuild the knowledge context for the current goal + data */
  function rebuildKnowledgeContext(): string {
    return buildKnowledgeContext({
      memories: topMemories,
      strategies: activeStrategies,
      claims: topClaims,
      actionSuggestions: actionSuggestions.map(s => ({
        action: s.action_name,
        confidence: s.success_probability,
        reason: s.reasoning,
      })),
      activeGoal,
      customerName: customerName,
      customerId,
      conversationSummary,
      planRecommendations,
      eventContext: ctx,
      activeSpec,
    });
  }

  let knowledgeContext = rebuildKnowledgeContext();

  // ── ReAct Loop ────────────────────────────────────────────────────
  pushToHistory(customerId, { role: 'user', content: message });

  // ReAct turn history: alternating assistant (THOUGHT+ACTION) and user (OBSERVATION) messages
  const reactTurns: { role: 'user' | 'assistant'; content: string }[] = [];
  let finalAnswer = '';
  let lastHandlerResult: HandlerResult | null = null;
  let lastRawLLMOutput = '';
  let parsedIntent: ParsedSidecarIntent = {
    intent: activeGoal ? 'query' : 'query',
    slots: {},
    raw_message: message,
    enable_semantic: true,
    claims_hint: [],
  };

  // Track consecutive same-action retries
  let lastAction = '';
  let consecutiveRetries = 0;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // ── Phase 1: THINK (LLM call) ─────────────────────────────────
    // Message order: system (primacy) → history → KNOWLEDGE (recency) → react turns
    const messagesForLLM: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...getCustomerHistory(customerId).slice(-16),
      { role: 'system', content: knowledgeContext },
      ...reactTurns,
    ];

    let llmOutput: string;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messagesForLLM,
        temperature: 0.7,
        max_tokens: 1024,
      });
      llmOutput = completion.choices[0]?.message?.content ?? '';
    } catch {
      llmOutput = `THOUGHT: LLM service unavailable.\nFINAL_ANSWER: I'm having a brief technical issue. Please try again in a moment.`;
    }

    lastRawLLMOutput = llmOutput;

    // ── Parse LLM output ──────────────────────────────────────────
    const parsed = parseReActOutput(llmOutput);

    if (parsed.finalAnswer) {
      finalAnswer = parsed.finalAnswer;

      sendStep({
        type: 'think',
        thought: parsed.thought,
        decision: 'finish',
      });

      await events.emitReflection(parsed.thought, 'finish', iteration, parentEventId);
      eventsEmitted.push('Cognitive:Reflection');
      break;
    }

    // Agent wants to take an action
    const { thought, action, actionInput } = parsed;

    // Track retry metadata
    if (action === lastAction) {
      consecutiveRetries++;
    } else {
      consecutiveRetries = 0;
    }
    lastAction = action;

    sendStep({ type: 'think', thought, action, action_input: actionInput });

    await events.emitThought(thought, action, actionInput, iteration, parentEventId);
    eventsEmitted.push('Cognitive:Thought');

    // Emit full reasoning trace so MINNS can learn from the agent's thought process
    await events.emitReasoning(
      { userMessage: message, iteration, knowledgeAvailable: { memories: topMemories.length, strategies: activeStrategies.length, claims: topClaims.length } },
      { decidedAction: action, params: actionInput },
      [`Goal: ${activeGoal ?? 'general'}`, `Thought: ${thought}`, `Action: ${action}`],
      parentEventId
    );
    eventsEmitted.push('Cognitive:Reasoning');

    // Heuristic: if LLM's THOUGHT references specific memories/claims, emit MemoryUsed/ClaimUsed
    emitUsageHeuristics(thought, topMemories, topClaims, queryId, parentEventId);

    // Push the LLM's reasoning as an assistant turn
    reactTurns.push({
      role: 'assistant',
      content: `THOUGHT: ${thought}\nACTION: ${action}\nACTION_INPUT: ${JSON.stringify(actionInput)}`,
    });

    // ── Phase 2: ACT ──────────────────────────────────────────────
    const handlerResult = await executeAction(action, actionInput, customerId);
    lastHandlerResult = handlerResult;

    sendStep({ type: 'act', action, result: handlerResult.data ?? handlerResult.response, success: handlerResult.success });

    // Infer goal from the action the LLM chose
    const actionGoal = intentToGoal[action];
    // Progress: 0.5 if action succeeded, 0.2 if ambiguous, 0.1 if failed
    const goalProgress = handlerResult.success === true ? 0.5
      : handlerResult.success === false ? 0.1
      : 0.2;
    await events.emitAction(
      action, actionInput, handlerResult.data ?? handlerResult.response,
      handlerResult.success,
      actionGoal ?? activeGoal, goalProgress, parentEventId,
      consecutiveRetries > 0 ? { attempt: consecutiveRetries, maxRetries: MAX_ITERATIONS } : undefined
    );
    eventsEmitted.push(`Action:${action}`);

    if (handlerResult.observationType && handlerResult.data) {
      await events.emitObservation(
        handlerResult.observationType, handlerResult.data,
        { confidence: 1.0, source: 'mock_database' }, parentEventId
      );
      eventsEmitted.push(`Observation:${handlerResult.observationType}`);

      // Emit observation data as a "fact" context so MINNS extracts claims from action results
      const factText = `${handlerResult.observationType}: ${JSON.stringify(handlerResult.data)}`;
      await events.emitContext(factText, 'fact', parentEventId);
      eventsEmitted.push('Context:observation_fact');
      sendStep({ type: 'context', contextType: 'fact', text: factText.slice(0, 120) });
    }

    // ── Phase 3: OBSERVE ──────────────────────────────────────────
    const observation = formatObservation(handlerResult);
    // Push the environment observation as a user turn so the LLM distinguishes its reasoning from external data
    reactTurns.push({
      role: 'user',
      content: `OBSERVATION: ${observation}`,
    });

    sendStep({ type: 'observe', observation });

    // ── Phase 3.5: GOAL RE-EVALUATION ─────────────────────────────
    // Check if the action or observation reveals a goal shift
    const inferredGoal = actionGoal ?? inferGoal(observation);
    let goalShifted = false;
    if (inferredGoal && inferredGoal !== activeGoal) {
      const priorGoal = activeGoal;
      activeGoal = inferredGoal;
      goalShifted = true;

      // Re-recall with recallContext for the new goal
      const freshRecall = await client.recallContext({
        agentId: config.agentId,
        context: buildEventContext({ customerId, lastMessage: message }, activeGoal),
        claimsQuery: message,
        strategyLimit: 5,
        memoryLimit: 5,
      });
      activeStrategies = rankStrategies(Array.isArray(freshRecall.strategies) ? freshRecall.strategies : [], 3);

      // Rebuild knowledge context so the next THINK sees the right strategies
      knowledgeContext = rebuildKnowledgeContext();

      sendStep({
        type: 'reflect',
        thought: `Goal shifted: ${priorGoal ?? 'general'} → ${activeGoal}. Refreshed strategies.`,
        decision: 'continue',
        goalShift: { from: priorGoal ?? 'general', to: activeGoal },
      });
      eventsEmitted.push(`GoalShift:${priorGoal ?? 'general'}->${activeGoal}`);
    }

    // ── Phase 4: REFLECT ──────────────────────────────────────────
    if (iteration === MAX_ITERATIONS - 1) {
      finalAnswer = handlerResult.response;
      sendStep({
        type: 'reflect',
        thought: 'Max iterations reached. Providing best available answer.',
        decision: 'finish',
      });
      await events.emitReflection('Max iterations reached', 'finish', iteration, parentEventId);
      eventsEmitted.push('Cognitive:Reflection');
    } else if (!goalShifted) {
      // Only emit the generic continue if we didn't already emit a goal-shift reflect
      sendStep({
        type: 'reflect',
        thought: `Completed ${action}. Evaluating if more actions are needed...`,
        decision: 'continue',
      });
    }
  }

  if (!finalAnswer) {
    finalAnswer = lastHandlerResult?.response ?? "I apologize, but I wasn't able to complete your request. Could you try rephrasing?";
  }

  // ── Phase 5: RESPOND — Use perceiveActLearn() for full PAL cycle ──
  if (activeSpec) {
    try {
      const palResult = await client.perceiveActLearn(AGENT_TYPE, config.agentId, config.sessionId, {
        message,
        modelOutput: lastRawLLMOutput,
        spec: activeSpec,
        claimsQuery: message,
        contextVariables: { customerId, customerName },
        goals: activeGoal ? [{ text: activeGoal, priority: 3, progress: 1.0 }] : [],
        memoryLimit: 5,
        strategyLimit: 5,
      });

      parsedIntent = palResult.intent;
      if (palResult.assistantResponse) {
        finalAnswer = palResult.assistantResponse;
      }
      eventsEmitted.push('PAL:perceiveActLearn');
    } catch {
      // Fallback to manual approach
      try {
        const result = extractIntentAndResponse(finalAnswer, message, activeSpec);
        parsedIntent = result.intent;
        if (result.assistantResponse) {
          finalAnswer = result.assistantResponse;
        }
      } catch {
        // LLM didn't include sidecar blocks — keep finalAnswer as-is
      }

      // Manual event emission as fallback
      const goalDesc: string | undefined = intentToGoal[parsedIntent.intent] ?? activeGoal;
      await events.emitAgentMessage(finalAnswer, parsedIntent.intent, goalDesc, 1.0, parentEventId);
      eventsEmitted.push('Communication:agent_response');

      const claimTexts = (parsedIntent.claims_hint && parsedIntent.claims_hint.length > 0)
        ? parsedIntent.claims_hint.map(c => c.text).join('. ')
        : finalAnswer;
      await events.emitContext(claimTexts, 'fact', parentEventId);
      eventsEmitted.push('Context:response_semantic');

      const overallSuccess = !!finalAnswer && (lastHandlerResult?.success === true || !lastHandlerResult);
      await events.emitOutcome(queryId, overallSuccess, goalDesc, parentEventId);
      eventsEmitted.push('Learning:Outcome');
    }
  } else {
    // No active spec — manual approach
    const goalDesc: string | undefined = activeGoal;
    await events.emitAgentMessage(finalAnswer, parsedIntent.intent, goalDesc, 1.0, parentEventId);
    eventsEmitted.push('Communication:agent_response');

    const claimTexts = finalAnswer;
    await events.emitContext(claimTexts, 'fact', parentEventId);
    eventsEmitted.push('Context:response_semantic');

    const overallSuccess = !!finalAnswer && (lastHandlerResult?.success === true || !lastHandlerResult);
    await events.emitOutcome(queryId, overallSuccess, goalDesc, parentEventId);
    eventsEmitted.push('Learning:Outcome');
  }

  // Map the SDK-parsed intent → goal description; fall back to the live activeGoal
  const goalDesc: string | undefined = intentToGoal[parsedIntent.intent] ?? activeGoal;

  eventsEmitted.push('EventsComplete');

  // Persist the final goal for the next turn of this customer's conversation
  setCustomerGoal(customerId, goalDesc ?? activeGoal);

  pushToHistory(customerId, { role: 'assistant', content: finalAnswer });

  sendStep({
    type: 'answer',
    reply: finalAnswer,
    intent: parsedIntent,
    debug: {
      memoriesRecalled: topMemories,
      strategiesConsulted: activeStrategies,
      claimsFound: topClaims,
      eventsEmitted,
      goalDesc: goalDesc ?? activeGoal ?? null,
      initialGoal: previousGoal ?? null,
      finalGoal: goalDesc ?? activeGoal ?? null,
    },
  });

  // Mark turn as completed so reconnecting clients get the full result
  turn.status = 'completed';
  turn.completedAt = Date.now();

  sse?.('done', {});
  return queryId;
}

// ── Usage Heuristics ─────────────────────────────────────────────────
// Detect when the LLM's THOUGHT references specific memories or claims

async function emitUsageHeuristics(
  thought: string,
  memories: MemoryResponse[],
  claims: ClaimSearchResponse[],
  queryId: string,
  parentEventId: string
) {
  const lowerThought = thought.toLowerCase();

  // Check if any memory's summary keywords appear in the thought
  for (const m of memories) {
    const keywords = m.summary.toLowerCase().split(/\s+/).filter(w => w.length > 5);
    const matchCount = keywords.filter(k => lowerThought.includes(k)).length;
    if (matchCount >= 2) {
      events.emitMemoryUsed(queryId, String(m.id), parentEventId).catch(() => {});
      break; // Emit at most one per iteration
    }
  }

  // Check if any claim text appears in the thought
  for (const c of claims) {
    const claimText = (c.claim_text || '').toLowerCase();
    if (claimText && claimText.length > 10) {
      const claimKeywords = claimText.split(/\s+/).filter(w => w.length > 5);
      const matchCount = claimKeywords.filter(k => lowerThought.includes(k)).length;
      if (matchCount >= 2) {
        if (c.claim_id) {
          events.emitClaimUsed(queryId, Number(c.claim_id), parentEventId).catch(() => {});
        }
        break;
      }
    }
  }
}

// ── Action Execution ────────────────────────────────────────────────

async function executeAction(
  action: string,
  params: Record<string, unknown>,
  customerId: string
): Promise<HandlerResult> {
  const mockIntent = (intent: string, slots: Record<string, string>): ParsedSidecarIntent => ({
    intent, slots, raw_message: '', enable_semantic: false,
  });

  switch (action) {
    case 'track_order':
    case 'order_status':
    case 'delivery_estimate':
      return handleOrderTracking(
        mockIntent(action, { order_id: String(params.order_id ?? '') }),
        customerId
      );
    case 'initiate_return':
      return handleReturns(
        mockIntent('initiate_return', {
          order_id: String(params.order_id ?? ''),
          reason: String(params.reason ?? ''),
        }),
        customerId
      );
    case 'refund_status':
      return handleReturns(
        mockIntent('refund_status', { order_id: String(params.order_id ?? '') }),
        customerId
      );
    case 'exchange':
      return handleReturns(
        mockIntent('exchange', { order_id: String(params.order_id ?? '') }),
        customerId
      );
    case 'product_info':
      return handleProducts(
        mockIntent('product_info', {
          product_id: String(params.product_id ?? ''),
          query: String(params.query ?? ''),
        }),
        customerId
      );
    case 'availability':
      return handleProducts(
        mockIntent('availability', { product_id: String(params.product_id ?? '') }),
        customerId
      );
    case 'recommend':
      return handleProducts(
        mockIntent('recommend', { category: String(params.category ?? '') }),
        customerId
      );
    case 'file_complaint':
      return handleComplaints(
        mockIntent('file_complaint', {
          subject: String(params.subject ?? ''),
          order_id: String(params.order_id ?? ''),
        }),
        customerId
      );
    case 'escalate':
      return handleComplaints(
        mockIntent('escalate', { complaint_id: String(params.complaint_id ?? '') }),
        customerId
      );
    case 'reset_password':
      return handleAccount(mockIntent('reset_password', {}), customerId);
    case 'account_info':
      return handleAccount(mockIntent('account_info', {}), customerId);
    case 'search_memories': {
      const query = String(params.query ?? '');
      const memRecall = await client.recallContext({
        agentId: config.agentId,
        context: buildEventContext({ customerId, lastMessage: query }),
        claimsQuery: query,
        memoryLimit: 10,
        strategyLimit: 0,
      });
      const relevant = rankMemories(memRecall.memories, 5);
      const summaries = relevant.map(m => `[${m.tier}] ${m.summary}`);
      return {
        response: relevant.length > 0
          ? `Found ${relevant.length} memories:\n${summaries.join('\n')}`
          : `No memories found for "${query}".`,
        data: { query, results: relevant },
        observationType: 'memory_search',
        success: relevant.length > 0,
      };
    }
    case 'search_claims': {
      const query = String(params.query ?? '');
      const claimResults = await client.searchClaims({ query_text: query, top_k: 10 });
      const ranked = rankClaims(claimResults, 5);
      const texts = ranked.map(c => c.claim_text || JSON.stringify(c));
      return {
        response: ranked.length > 0
          ? `Found ${ranked.length} claims:\n${texts.join('\n')}`
          : `No claims found for "${query}".`,
        data: { query, results: ranked },
        observationType: 'claim_search',
        success: ranked.length > 0,
      };
    }
    case 'search_knowledge': {
      const query = String(params.query ?? '');
      const mode = String(params.mode ?? 'Hybrid');
      try {
        const searchResults = await client.search({
          query,
          mode: mode as 'Hybrid' | 'Semantic' | 'Keyword',
          limit: 10,
        });
        const results = searchResults.results ?? [];
        const texts = results.map((r: any) => `[${r.node_type ?? 'node'}] score=${r.score?.toFixed(3)}: ${JSON.stringify(r.properties ?? {}).slice(0, 200)}`);
        return {
          response: results.length > 0
            ? `Found ${results.length} results (${mode} search):\n${texts.join('\n')}`
            : `No results found for "${query}" (${mode} search).`,
          data: { query, mode, total: searchResults.total ?? 0, results },
          observationType: 'knowledge_search',
          success: results.length > 0,
        };
      } catch {
        return {
          response: `Knowledge search failed for "${query}".`,
          success: false,
        };
      }
    }
    default: {
      // Demo mode: any unrecognized action succeeds with its params echoed back.
      // This lets the agent handle arbitrary requests (place_order, update_delivery, etc.)
      // without needing a dedicated handler for each one.
      const paramSummary = Object.entries(params)
        .map(([k, v]) => `- **${k}**: ${v}`)
        .join('\n');
      return {
        response: `Action **${action}** completed successfully.${paramSummary ? `\n\nDetails:\n${paramSummary}` : ''}`,
        data: { action, ...params, status: 'completed', timestamp: new Date().toISOString() },
        observationType: action,
        success: true,
      };
    }
  }
}

// ── Parser ──────────────────────────────────────────────────────────

interface ReActParsed {
  thought: string;
  action: string;
  actionInput: Record<string, unknown>;
  finalAnswer: string | null;
}

function parseReActOutput(output: string): ReActParsed {
  const finalMatch = output.match(/FINAL_ANSWER:\s*([\s\S]+?)$/i);
  if (finalMatch) {
    const thoughtMatch = output.match(/THOUGHT:\s*([\s\S]+?)(?=FINAL_ANSWER:)/i);
    return {
      thought: thoughtMatch?.[1]?.trim() ?? 'Providing final answer.',
      action: '',
      actionInput: {},
      finalAnswer: finalMatch[1].trim(),
    };
  }

  const thoughtMatch = output.match(/THOUGHT:\s*([\s\S]+?)(?=ACTION:)/i);
  const actionMatch = output.match(/ACTION:\s*(\S+)/i);
  const inputMatch = output.match(/ACTION_INPUT:\s*(\{[\s\S]*?\})/i);

  const thought = thoughtMatch?.[1]?.trim() ?? output.trim();
  const action = actionMatch?.[1]?.trim() ?? 'track_order';

  let actionInput: Record<string, unknown> = {};
  if (inputMatch) {
    try {
      actionInput = JSON.parse(inputMatch[1]);
    } catch {
      actionInput = {};
    }
  }

  return { thought, action, actionInput, finalAnswer: null };
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatObservation(result: HandlerResult): string {
  if (result.data) {
    return `${result.response}\nData: ${JSON.stringify(result.data, null, 2)}`;
  }
  return result.response;
}

// ── Goal inference ──────────────────────────────────────────────────

/**
 * Infer the goal from arbitrary text (user message or observation) by running
 * the SDK's intent extraction against EVERY registered spec. The first spec
 * that produces a non-fallback intent wins, and we map that intent → goal
 * via intentToGoal.
 *
 * Passes the text directly to the SDK — no manual wrapping.
 */
function inferGoal(text: string): string | undefined {
  for (const spec of allSpecs) {
    try {
      const { intent } = extractIntentAndResponse(text, text, spec);
      if (intent.intent !== spec.fallback_intent) {
        return intentToGoal[intent.intent];
      }
    } catch {
      // This spec didn't match — try the next one
    }
  }
  return undefined;
}

/**
 * Rank memories by a composite score of strength (significance) and recency,
 * then return only the top N.
 */
function rankMemories(memories: MemoryResponse[], limit: number): MemoryResponse[] {
  if (memories.length <= limit) return memories;

  return [...memories]
    .sort((a, b) => {
      // Primary: strength (significance) descending
      const strengthDiff = (b.strength ?? 0) - (a.strength ?? 0);
      if (Math.abs(strengthDiff) > 0.05) return strengthDiff;
      // Tiebreaker: higher ID = more recent
      return Number(b.id) - Number(a.id);
    })
    .slice(0, limit);
}

/**
 * Rank strategies by quality_score descending, return top N.
 */
function rankStrategies(strategies: StrategyResponse[], limit: number): StrategyResponse[] {
  if (strategies.length <= limit) return strategies;

  return [...strategies]
    .sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0))
    .slice(0, limit);
}

/**
 * Rank claims by confidence descending, return top N.
 */
function rankClaims(claims: ClaimSearchResponse[], limit: number): ClaimSearchResponse[] {
  if (claims.length <= limit) return claims;

  return [...claims]
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, limit);
}
