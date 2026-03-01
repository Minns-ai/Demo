# minns-sdk

A high-performance TypeScript SDK for [minns](https://minns.ai) — a self-evolving agentic database that transforms discrete events into semantic graphs with memories, strategies, and claims. Built for autonomous agents and LLM-powered applications.

```bash
npm install minns-sdk
```

```typescript
import { createClient, EventBuilder, IntentSpecRegistry, /* ... */ } from 'minns-sdk';
```

---

## Quick Start

```typescript
import { createClient } from 'minns-sdk';

// 1. Create a client with default agent/session IDs
const client = createClient("your-api-key", { agentId: 2001, sessionId: 100 });

// 2. Send an action event (3 lines)
await client.event("my-agent")
  .action("search_database", { query: "quantum computing" })
  .send();

// 3. Search across the graph
const results = await client.search("quantum computing breakthroughs");

// 4. Recall memories, strategies, and claims in one call
const recall = await client.recallContext({
  agentId: 2001,
  context: eventContext,
  claimsQuery: "quantum computing",
});

// 5. Clean up before shutdown
await client.destroy();
```

---

## Client Configuration

```typescript
import { createClient } from 'minns-sdk';

// Simple — API key only (connects to https://minns.ai)
const client = createClient("your-api-key");

// Recommended — set default IDs so every builder inherits them
const client = createClient("your-api-key", { agentId: 2001, sessionId: 100 });

// Full configuration (use the client constructor directly)
import { MinnsClient } from 'minns-sdk';

const client = new MinnsClient({
  apiKey: "your-api-key",
  agentId: 2001,                // Default agent ID for all builders
  sessionId: 100,               // Default session ID for all builders
  debug: true,                  // Log all requests/responses to console
  enableDefaultTelemetry: true, // Send telemetry to /api/telemetry
  enableSemantic: true,         // Semantic indexing on all events by default
  autoBatch: true,              // Buffer events for network efficiency
  batchInterval: 100,           // Flush every 100ms
  batchMaxSize: 20,             // Or every 20 events
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | **(required)** | API key for authentication. Sent as `Bearer` token. |
| `agentId` | `AgentId` | — | Default agent ID applied to all event builders. |
| `sessionId` | `SessionId` | — | Default session ID applied to all event builders. |
| `timeout` | `number` | `30000` | Request timeout in milliseconds. |
| `headers` | `Record<string, string>` | `Content-Type: application/json` | Custom HTTP headers (merged with defaults). |
| `debug` | `boolean` | `false` | Log all requests and responses to the console. |
| `enableSemantic` | `boolean` | `false` | Enable semantic indexing on all events by default. Can be overridden per-event. |
| `enableDefaultTelemetry` | `boolean` | `false` | Send telemetry to `/api/telemetry` (fire-and-forget). |
| `onTelemetry` | `(data: TelemetryData) => void` | — | Custom telemetry callback. |
| `maxPayloadSize` | `number` | `1048576` | Maximum payload size in bytes (1MB). |
| `defaultAsync` | `boolean` | `false` | If true, `processEvent()` fires in the background. |
| `autoBatch` | `boolean` | `false` | Buffer events and send in batches. |
| `batchInterval` | `number` | `100` | Max ms before flushing the batch queue. |
| `batchMaxSize` | `number` | `10` | Max events before forcing a flush. |
| `maxQueueSize` | `number` | `1000` | Max local queue depth before `enqueue()` throws. |

> **Note:** The base URL is `https://minns.ai` and is not configurable.

---

## EventBuilder (Fluent API)

Create a builder with `client.event(agentType, config?)`. When `agentId` and `sessionId` are set on the client, every builder inherits them automatically:

```typescript
// Uses client defaults — no config needed
const builder = client.event("my-agent");

// Override per-event when needed
const builder = client.event("my-agent", { agentId: 9999, sessionId: 42 });

// Enable semantic indexing for this event only
const builder = client.event("my-agent", { enableSemantic: true });
```

### Event Type Methods

Each builder defines **one** event type. Calling a second replaces the first.

| Method | Description |
|--------|-------------|
| `.action(name, params)` | Define an Action event. |
| `.observation(type, data, options?)` | Define an Observation event. Options: `{ confidence?, source? }`. |
| `.context(text, type?)` | Define a Context event (for claim extraction). Default type: `"general"`. |
| `.communication(messageType, sender, recipient, content)` | Define a Communication event. |
| `.cognitive(processType, input, output, reasoningTrace?)` | Define a Cognitive event. `processType`: `"GoalFormation"`, `"Planning"`, `"Reasoning"`, `"MemoryRetrieval"`, `"LearningUpdate"`. |
| `.learning(learningEvent)` | Define a Learning event (feedback loop). See Learning Event Variants below. |

### Metadata & Configuration Methods

| Method | Description |
|--------|-------------|
| `.meta(key, value)` | Add a metadata key-value pair. Auto-wraps in `MetadataValue` (String, Integer, Float, Boolean, Json). |
| `.duration(ms)` | Set action duration in milliseconds (converted to nanoseconds). Requires `.action()` first. |
| `.semantic(enabled?)` | Enable/disable semantic indexing for this event. Default: `true`. |
| `.language(lang)` | Set language for Context events. Default: `"en"`. |
| `.isCode(enabled?)` | Mark event as containing source code. Activates code tokenizer, code BM25 indexing, and NLQ code routing. Default: `true`. |

### Action Outcome Methods

Attach an outcome to a previously defined `.action()`. **Throws if no action defined.**

| Method | Description |
|--------|-------------|
| `.outcome(result)` | Mark the action as successful with the given result. |
| `.failure(error, errorCode?)` | Mark the action as failed. `errorCode` defaults to `0`. |
| `.partial(result, issues)` | Mark the action as partially successful with a list of issues. |
| `.retry(attempt, maxRetries)` | Attach retry metadata (injected into `event.metadata`). |

### Context & Submission Methods

| Method | Description |
|--------|-------------|
| `.state(variables)` | Add environment variables (e.g. `{ user_id: "alice" }`). Merges with existing. |
| `.goal(text, priority?, progress?)` | Add an active goal. Priority: `1`–`5` (default `3`). Progress: `0`–`1`. |
| `.causedBy(parentId)` | Link this event to a parent event ID (causality chain). |
| `.build()` | Return the raw `Event` object without sending. |
| `.send()` | Build and send. **Awaits server response.** Returns `ProcessEventResponse`. |
| `.enqueue()` | Build and queue for background processing. Returns `LocalAck` immediately. |

### Learning Event Variants

The `.learning()` method accepts one of these discriminated union variants:

```typescript
// Memory was retrieved from the store
.learning({ MemoryRetrieved: { query_id: "q1", memory_ids: [101, 102] } })

// A specific memory was used by the agent
.learning({ MemoryUsed: { query_id: "q1", memory_id: 101 } })

// Strategies were served to the agent
.learning({ StrategyServed: { query_id: "q1", strategy_ids: [1, 2, 3] } })

// A specific strategy was used
.learning({ StrategyUsed: { query_id: "q1", strategy_id: 1 } })

// Outcome of the action (for reinforcement learning)
.learning({ Outcome: { query_id: "q1", success: true } })

// Claims were retrieved
.learning({ ClaimRetrieved: { query_id: "q1", claim_ids: [10, 11] } })

// A specific claim was used
.learning({ ClaimUsed: { query_id: "q1", claim_id: 10 } })
```

Named types (`MemoryRetrievedEvent`, `MemoryUsedEvent`, `StrategyServedEvent`, `StrategyUsedEvent`, `OutcomeEvent`, `ClaimRetrievedEvent`, `ClaimUsedEvent`) are exported for use in type-safe helpers:

```typescript
import type { MemoryUsedEvent, OutcomeEvent } from 'minns-sdk';
```

### Examples

```typescript
// Action with metadata and duration
await client.event("my-agent")
  .action("api_call", { endpoint: "/users" })
  .meta("source", "user_request")
  .meta("priority", 5)
  .duration(150)
  .outcome({ status: 200, count: 42 })
  .send();

// Action with failure and retry
await client.event("my-agent")
  .action("api_call", { endpoint: "/users" })
  .failure("timeout", 408)
  .retry(2, 3)
  .send();

// Context event with semantic indexing and language
await client.event("my-agent")
  .context("I prefer action movies and usually go on Friday evenings", "user_preference")
  .semantic(true)
  .language("en")
  .state({ user_id: "alice@example.com" })
  .send();

// Communication event
await client.event("coordinator")
  .communication("task_assignment", 1001, 2001, { task: "research" })
  .send();

// Cognitive event (agent reasoning)
await client.event("planner")
  .cognitive("Planning", { goal: "optimize" }, { plan: ["step1", "step2"] }, ["considered A", "chose B"])
  .send();

// Learning feedback loop
await client.event("learner")
  .learning({ Outcome: { query_id: "action-123", success: true } })
  .send();

// Code event with code-aware indexing
await client.event("code-analyzer")
  .context("fn process_event(&self, event: Event) -> Result<()> { ... }", "code")
  .isCode()
  .semantic(true)
  .send();

// Fire-and-forget with enqueue()
const receipt = await client.event("my-agent")
  .observation("web_page", { url: "https://example.com" })
  .enqueue();
```

### Runtime Validation

The builder validates at `.build()` / `.send()` / `.enqueue()` time:
- `agentId` and `sessionId` must be set (from client defaults or per-event config).
- An event type (`.action()`, `.observation()`, `.context()`, `.communication()`, `.cognitive()`, or `.learning()`) must be defined.
- `.outcome()`, `.failure()`, `.partial()`, and `.duration()` require `.action()` first.
- Empty strings for action names, observation types, context text, communication message types, and goal descriptions throw errors.
- `id` and `timestamp` are client-generated automatically (u128 UUID and nanosecond timestamp).

---

## Search

Unified search across the graph: **Keyword** (BM25), **Semantic** (embedding), or **Hybrid** mode.

```typescript
// String shorthand — defaults to Hybrid mode
const results = await client.search("memory consolidation");

// Full options
const results = await client.search({
  query: "memory consolidation",
  mode: "Semantic",
  limit: 20,
  fusion_strategy: "RRF"   // "RRF" | "Linear" | "Max"
});

// results.results — SearchResult[] (node_id, score, node_type, properties)
// results.mode   — SearchMode used
// results.total  — total match count
```

---

## Claims (Semantic Memory)

Claims are atomic facts extracted from events via the NER → LLM → Embedding pipeline. Triggered by `enableSemantic: true` on any event type.

```typescript
// List active claims (with camelCase option)
const claims = await client.getClaims({ limit: 10, eventId: 42 });

// Get a single claim by ID
const claim = await client.getClaimById(123);

// Semantic search — camelCase
const results = await client.searchClaims({
  queryText: "Who is the project manager?",
  topK: 3,
  minSimilarity: 0.75
});

// Semantic search — snake_case (also accepted)
const results = await client.searchClaims({
  query_text: "Who is the project manager?",
  top_k: 3,
  min_similarity: 0.75
});

// Process pending claims to generate embeddings
const processed = await client.processEmbeddings(100);
```

### `ClaimResponse`

| Field | Type | Description |
|-------|------|-------------|
| `claim_id` | `UInt64` | Unique claim ID. |
| `claim_text` | `string` | The extracted claim text. |
| `confidence` | `number` | Extraction confidence (0–1). |
| `source_event_id` | `UInt64` | Event that produced this claim. |
| `similarity` | `number \| null` | Similarity score (populated during search). |
| `evidence_spans` | `EvidenceSpan[]` | Source text spans supporting the claim. |
| `support_count` | `number` | Number of corroborating events. |
| `status` | `string` | Claim status (active, superseded, etc.). |
| `claim_type` | `string` | Type of claim. |
| `subject_entity` | `string` | Primary entity of the claim. |
| `entities` | `ClaimEntity[]` | All entities found in the claim. |
| `temporal_weight` | `number` | Recency-weighted relevance. |
| `superseded_by` | `UInt64 \| null` | ID of claim that replaced this one. |

---

## Memory API

Memories are long-term learned experiences organized into a three-tier hierarchy:

| Tier | Description | Created By |
|------|-------------|------------|
| **Episodic** | Specific experiences (what happened in one episode) | Automatic |
| **Semantic** | Generalized knowledge (patterns across 3+ similar episodes) | Consolidation engine |
| **Schema** | Reusable mental models (high-level principles from 3+ semantics) | Consolidation engine |

### Methods

```typescript
// Get memories for an agent, sorted by strength
const memories = await client.getAgentMemories(2001, 10);

// Find memories similar to a provided context
const contextMemories = await client.getContextMemories(eventContext, {
  limit: 5,
  min_similarity: 0.8,
  agent_id: 2001,
  session_id: null
});
```

### `MemoryResponse`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `UInt64` | Unique memory ID. |
| `agent_id` | `AgentId` | Owning agent. |
| `session_id` | `SessionId` | Originating session. |
| `summary` | `string` | Natural language summary of what happened. |
| `takeaway` | `string` | The single most important lesson from this experience. |
| `causal_note` | `string` | Why it succeeded or failed — key causal factors. |
| `tier` | `"Episodic" \| "Semantic" \| "Schema"` | Memory hierarchy tier. |
| `consolidation_status` | `"Active" \| "Consolidated" \| "Archived"` | Lifecycle status. |
| `schema_id?` | `UInt64` | Parent schema memory ID (if consolidated). |
| `consolidated_from?` | `UInt64[]` | Source memory IDs (for merged memories). |
| `strength` | `number` | Memory strength (0–1). |
| `relevance_score` | `number` | Relevance to current context. |
| `access_count` | `number` | Times this memory has been retrieved. |
| `formed_at` | `number \| string` | Nanosecond timestamp when formed. |
| `last_accessed` | `number \| string` | Nanosecond timestamp of last access. |
| `context_hash` | `ContextHash` | Environment fingerprint. |
| `context` | `EventContext` | Full environmental context at formation. |
| `outcome` | `string` | Episode outcome (`"Success"`, `"Failure"`, etc.). |
| `memory_type` | `string` | Tier label (same as `tier`). |

> **Note:** `summary`, `takeaway`, and `causal_note` are auto-generated from event data. When LLM refinement is enabled on the server, these are asynchronously polished by gpt-4o-mini.

---

## Strategy API

Strategies are learned behavioral patterns. Each includes an LLM-readable summary, executable playbook, known failure modes, and counterfactual analysis.

### Methods

```typescript
// Get strategies for an agent
const strategies = await client.getAgentStrategies(2001, 5);

// Find strategies matching a multi-dimensional similarity query
const similar = await client.getSimilarStrategies({
  goal_ids: [703385],
  tool_names: ["search_docs"],
  result_types: ["Success"],
  context_hash: 3677117734126165,
  agent_id: 2001,
  min_score: 0.3,
  limit: 5
});

// Get best next action based on context
const suggestions = await client.getActionSuggestions(contextHash, lastActionNode, 5);
```

### `StrategyResponse`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Strategy ID. |
| `name` | `string` | Auto-generated name (e.g. `strategy_2001_ep_16`). |
| `agent_id` | `AgentId` | Owning agent. |
| `summary` | `string` | Natural language summary of the strategy. |
| `when_to_use` | `string` | Conditions where this strategy applies. |
| `when_not_to_use` | `string` | Conditions where this strategy should NOT be used. |
| `failure_modes` | `string[]` | Known failure modes with recovery hints. |
| `playbook` | `PlaybookStep[]` | Executable steps with branching and recovery. |
| `counterfactual` | `string` | What would have happened with a different approach. |
| `supersedes` | `UInt64[]` | IDs of strategies this one replaces (version lineage). |
| `applicable_domains` | `string[]` | Cross-domain applicability tags. |
| `quality_score` | `number` | Overall quality (0–1). |
| `success_count` | `number` | Times succeeded. |
| `failure_count` | `number` | Times failed. |
| `reasoning_steps` | `ReasoningStepResponse[]` | Ordered reasoning steps (description + sequence_order). |
| `strategy_type` | `string` | `"Positive"` or `"Negative"`. |
| `support_count` | `number` | Number of supporting episodes. |
| `expected_success` | `number` | Predicted success probability. |
| `expected_cost` | `number` | Estimated cost (action count). |
| `expected_value` | `number` | Expected value score. |
| `confidence` | `number` | Statistical confidence. |
| `goal_bucket_id` | `number` | The goal bucket this strategy serves. |
| `behavior_signature` | `string` | Hashed behavioral fingerprint. |
| `precondition` | `string` | Human-readable precondition summary. |
| `action_hint` | `string` | Suggested action sequence. |

### `PlaybookStep`

| Field | Type | Description |
|-------|------|-------------|
| `step` | `number` | Step number (1-indexed). |
| `action` | `string` | What to do at this step. |
| `condition` | `string` | Prerequisite condition. |
| `skip_if` | `string` | When to skip this step. |
| `recovery` | `string` | Recovery instruction if this step fails. |
| `branches` | `PlaybookBranch[]` | Conditional alternative actions. |

### `ActionSuggestionResponse`

| Field | Type | Description |
|-------|------|-------------|
| `action_name` | `string` | Recommended next action. |
| `success_probability` | `number` | Predicted success rate. |
| `evidence_count` | `number` | How many past episodes support this. |
| `reasoning` | `string` | Why this action is recommended. |

---

## Episodes

```typescript
const episodes = await client.getEpisodes(10);
```

### `EpisodeResponse`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `UInt64` | Episode ID. |
| `agent_id` | `AgentId` | Agent that generated this episode. |
| `event_count` | `number` | Number of events in the episode. |
| `significance` | `number` | Computed significance score. |
| `outcome` | `string \| null` | Episode outcome. |

---

## Analytics & Graph

### Analytics

```typescript
// High-level graph metrics
const analytics = await client.getAnalytics();

// Community detection
const communities = await client.getCommunities("louvain"); // or "label_propagation"

// Node centrality scores (degree, betweenness, closeness, eigenvector, pagerank)
const centrality = await client.getCentrality();

// Personalized PageRank from a source node (camelCase options)
const ppr = await client.getPersonalizedPageRank(42, { limit: 10, minScore: 0.01 });

// Temporal reachability (camelCase options)
const reachable = await client.getReachability(42, { maxHops: 5, maxResults: 100 });

// Causal path between two nodes
const path = await client.getCausalPath(42, 99);

// Property index performance stats
const indexStats = await client.getIndexStats();
```

### Graph

```typescript
// Graph structure for visualization
const graph = await client.getGraph({ limit: 100, session_id: 101 });

// Context-anchored subgraph
const subgraph = await client.getGraphByContext({ context_hash: 987654321 });

// Direct node search by properties
const nodes = await client.queryGraphNodes({
  node_types: ["Action", "Memory"],
  property_filters: [{ key: "agent_id", value: 2001, operator: "equals" }]
});

// Traverse relationships from a starting node
const traversal = await client.traverseGraph({ start: "42", max_depth: 3 });

// Persist in-memory graph state to disk (ReDB)
const result = await client.persistGraph();
```

---

## Planning & World Model

Generate strategies and action plans using LLM + world model scoring. Requires `ENABLE_WORLD_MODEL=true` and/or `ENABLE_STRATEGY_GENERATION=true` server-side.

```typescript
// Shorthand — pass just a goal description (uses client defaults)
const plan = await client.plan("Reduce API latency by 50%");

// Full planning pipeline (strategies + actions)
const plan = await client.createPlan({
  goal_description: "Reduce API latency by 50%",
  goal_bucket_id: 1,
  context_fingerprint: 987654321,
  session_id: 100,
});

// Generate strategy candidates only
const strategies = await client.generateStrategies({
  goal_description: "Reduce API latency by 50%",
  goal_bucket_id: 1,
  context_fingerprint: 987654321,
});

// Generate action candidates for a strategy step
const actions = await client.generateActions({
  goal_description: "Reduce API latency by 50%",
  goal_bucket_id: 1,
  step_index: 0,
  context_fingerprint: 987654321,
});

// Start execution tracking (enables predictive validation)
const execution = await client.startExecution({
  goal_description: "Reduce API latency by 50%",
  goal_bucket_id: 1,
  context_fingerprint: 987654321,
  session_id: 100,
});

// Validate an event against predicted world state
const validation = await client.validateEvent({
  execution_id: execution.execution_id,
  event: actionEvent,
});

// World model statistics
const wmStats = await client.getWorldModelStats();
```

---

## Admin

```typescript
// Export entire database as binary
const data = await client.exportDatabase(); // Returns ArrayBuffer

// Import database from binary (mode: "replace" or "merge")
const result = await client.importDatabase(data, "merge");
```

---

## PAL Helpers

High-level methods that combine multiple API calls into single operations.

### `recallContext(opts)`

Fires `getAgentStrategies`, `getContextMemories`, and `searchClaims` in parallel. Each call is wrapped in `.catch(() => [])` so partial failures don't block.

```typescript
const recall = await client.recallContext({
  agentId: 2001,
  context: eventContext,
  claimsQuery: "user preferences",
  memoryLimit: 5,
  strategyLimit: 5,
});

// recall.strategies — StrategyResponse[]
// recall.memories  — MemoryResponse[]
// recall.claims    — ClaimSearchResponse[]
// recall.recall_ms — total time in ms
```

### `perceiveActLearn(agentType, agentId, sessionId, opts)`

Full Perceive-Act-Learn cycle in one call:
1. **RECALL**: Parallel context retrieval (strategies, memories, claims)
2. **PERCEIVE**: Parse LLM output via `extractIntentAndResponse`
3. **RECORD**: Emit Observation (if perception data), Action (with outcome/failure + retry), and Learning Outcome events

```typescript
const result = await client.perceiveActLearn("my-agent", 2001, 100, {
  message: "Find me a good Italian restaurant",
  modelOutput: llmRawOutput,
  spec: intentSpec,
  claimsQuery: "restaurant preferences",
  contextVariables: { location: "NYC" },
  goals: [{ text: "find restaurant", priority: 4, progress: 0.2 }],
  retry: { attempt: 0, maxRetries: 3 },
  causedBy: "previous-event-id",
  memoryLimit: 5,
  strategyLimit: 5,
});

// result.recall           — RecallContextResult
// result.intent           — ParsedSidecarIntent
// result.assistantResponse — Clean text to show the user
// result.eventIds         — IDs of all emitted events
// result.total_ms         — Total cycle time in ms
```

---

## LLM Sidecar Intent Parsing

Extract structured intents from LLM responses locally — no network round-trips, no extra LLM calls.

### Basic Usage

```typescript
import { buildSidecarInstruction, extractIntentAndResponse } from 'minns-sdk';

// 1. Generate a prompt instruction block for your LLM
const instruction = buildSidecarInstruction(intentSpec);

// 2. Append instruction to your system prompt, then call your LLM

// 3. Parse the LLM output locally
const { intent, assistantResponse } = extractIntentAndResponse(
  llmOutput,
  userMessage,
  intentSpec,
  { onTelemetry: (data) => console.log(data) }
);

// intent.intent          — matched intent name (e.g. "search")
// intent.slots           — extracted slot values { query: "...", limit: 5 }
// intent.context         — context string
// intent.confidence      — 0..1 confidence score
// intent.goal_updates    — optional goal progress updates
// intent.claims_hint     — optional claim hints for semantic indexing
// intent.perception      — optional perception data
// intent.outcome_capture — optional outcome capture
// intent.raw_message     — original user message
// intent.enable_semantic — computed by spec.enableSemantic policy hook
// assistantResponse      — clean text to show the user
```

### `buildContextSnippet(context, spec)`

Safely serializes a context object for injection into LLM prompts. Respects `spec.maxContextChars` (default 800).

```typescript
import { buildContextSnippet } from 'minns-sdk';

const snippet = buildContextSnippet(eventContext, intentSpec);
// Safe JSON string, truncated if needed, handles circular refs
```

### Intent Spec Definition

```typescript
import type { IntentSpec } from 'minns-sdk';

const spec: IntentSpec = {
  domain: "restaurant_booking",
  fallback_intent: "query",
  intents: [
    { name: "search", slots: { query: { type: "string" }, cuisine: { optional: true, enum: ["italian", "japanese", "mexican"] } } },
    { name: "book", slots: { restaurant_id: { type: "number" }, party_size: { type: "number" }, date: { type: "string" } } },
    { name: "cancel", slots: { booking_id: { type: "string" } } },
    { name: "query" },
  ],
  maxContextChars: 800,
  extensions: {
    allow_goal_updates: true,
    allow_claims_hint: true,
    allow_perception: true,
    allow_outcome_capture: true,
    max_claims_hint: 5,
    max_goal_updates: 3,
    max_perception_elements: 20,
    max_alternatives: 5,
    allowed_claim_types: ["preference", "constraint", "complaint"],
  },
  enableSemantic: (intent) => !!intent.claims_hint || intent.intent === "preference",
};
```

### IntentSpecRegistry

Manage multiple intent specs per agent type and goal.

```typescript
import { IntentSpecRegistry } from 'minns-sdk';

const registry = new IntentSpecRegistry();

registry.registerForGoal("booking-agent", "book_restaurant", restaurantSpec);
registry.registerForGoal("booking-agent", "find_movie", movieSpec);
registry.registerAgentFallback("booking-agent", generalSpec);

const spec = registry.resolve("booking-agent", [{ description: "book_restaurant" }]);
```

---

## Batch Processing

### `processEvents(events, options?)`

Send multiple pre-built events at once. Automatically chunks into `batchMaxSize`-sized requests.

```typescript
const events = [
  client.event("agent").action("a", {}).build(),
  client.event("agent").action("b", {}).build(),
];

await client.processEvents(events, { enableSemantic: true });
```

### `flush(options?)`

Manually flush the local event buffer when using `autoBatch` mode.

```typescript
await client.flush();
```

### `destroy()` / `close()`

Flush pending events and release the batch timer. Call before discarding the client to prevent timer leaks.

```typescript
await client.destroy();
// or equivalently:
await client.close();
```

---

## Simple Events

Quick integration path — no builder required.

```typescript
await client.sendSimpleEvent({
  agent_id: 2001,
  agent_type: "assistant",
  session_id: 100,
  action: "respond",
  data: { query: "hello", tokens: 150 },
  success: true,
  enable_semantic: true,
});
```

---

## Typed Event Shortcuts

Specialized endpoints that auto-detect and populate structured memory (state machines, ledgers) without needing to construct full events.

### State Changes

Track entity state transitions. The server auto-updates structured memory state machines.

```typescript
await client.sendStateChangeEvent({
  agent_id: 2001,
  agent_type: "workflow-engine",
  session_id: 100,
  entity: "Order-123",
  new_state: "shipped",
  old_state: "processing",
  trigger: "warehouse_confirmation",
  extra_metadata: { warehouse: "US-West" },
});
```

### Transactions

Track financial or quantity transactions. The server auto-appends to structured memory ledgers.

```typescript
await client.sendTransactionEvent({
  agent_id: 2001,
  agent_type: "payment-service",
  session_id: 100,
  from: "Alice",
  to: "Bob",
  amount: 25.0,
  direction: "Credit",   // "Credit" (adds) or "Debit" (subtracts)
  description: "Payment for services",
  extra_metadata: { invoice_id: "INV-456" },
});
```

---

## Conversation Ingestion

A fast-path for ingesting multi-turn conversations directly into structured memory. Messages are automatically classified into categories (transaction, state change, relationship, preference, or chitchat) and bridged into the appropriate templates. No events or episodes are created — data goes directly into structured memory.

### Ingest Conversations

```typescript
const result = await client.ingestConversations({
  case_id: "trip_expenses_2024",
  sessions: [
    {
      session_id: "session_01",
      topic: "Dinner expenses",
      messages: [
        { role: "user", content: "Alice: Paid €179 for museum - split with Bob" },
        { role: "user", content: "Bob: Paid €107 for dinner - split among all" },
        { role: "user", content: "The weather was lovely today!" },
      ],
    },
    {
      session_id: "session_02",
      topic: "Moving plans",
      messages: [
        { role: "user", content: "I live in Alfama, Lisbon." },
        { role: "user", content: "I'm moving to Lower Manhattan, NYC." },
        { role: "user", content: "Johnny Fisher works with Christopher Peterson." },
      ],
    },
  ],
  include_assistant_facts: false,
});

// result.messages_processed   — 6
// result.transactions_found   — 2
// result.state_changes_found  — 2
// result.relationships_found  — 1
// result.chitchat_skipped     — 1
```

**Incremental ingestion:** Use the same `case_id` across calls. The server preserves name→ID mappings and deduplicates already-processed messages automatically.

```typescript
// Call 1: First batch
await client.ingestConversations({ case_id: "trip_2024", sessions: [batch1] });

// Call 2: More messages arrive later (same case_id)
await client.ingestConversations({ case_id: "trip_2024", sessions: [batch2] });
// Duplicate messages from batch1 are skipped automatically
```

### Query Conversations

Query structured memory populated by conversation ingestion. Every response includes `related_memories` and `related_strategies` from the episodic stores via BM25 retrieval.

```typescript
// String shorthand
const res = await client.queryConversations("Who owes whom?");

// With session for NLQ follow-ups (camelCase)
const res = await client.queryConversations({
  question: "What is the balance between Alice and Bob?",
  sessionId: "session-1",
});

// res.answer             — "Settlement: Alice -> Bob : 172.50 EUR"
// res.query_type         — "numeric" | "state" | "entity_summary" | "preference" | "relationship" | "nlq"
// res.memory_context     — structured memory backing the answer (ledgers, states, etc.)
// res.related_memories   — top 5 episodic/semantic/schema memories
// res.related_strategies — top 3 strategies matching the question
```

| `query_type` | Triggers on | Example question |
|--------------|-------------|------------------|
| `"numeric"` | owes, balance, settle, debt, total | `"Who owes whom?"` |
| `"state"` | where is, current state, location | `"Where is the user?"` |
| `"entity_summary"` | who is, tell me about, describe | `"Who is Alice?"` |
| `"preference"` | recommend, favorite, what do I like | `"What art do I like?"` |
| `"relationship"` | related, connected, path between | `"Are Alice and Bob related?"` |
| `"nlq"` | *(fallback)* | Any other question |

---

## Events

```typescript
// List recent events
const events = await client.getEvents(20);
```

---

## System & Health

```typescript
const stats = await client.getStats();
const health = await client.healthCheck();
// { status: "ok", version: "0.1.0", uptime_seconds: 3600, is_healthy: true, ... }
```

---

## Complete API Reference

### Client Methods (49)

| Method | Returns | Description |
|--------|---------|-------------|
| `event(agentType, config?)` | `EventBuilder` | Create a fluent event builder. |
| `processEvent(event, options?)` | `ProcessEventResponse` | Send a single event. |
| `processEvents(events, options?)` | `ProcessEventResponse` | Batch send events (auto-chunked). |
| `flush(options?)` | `void` | Flush the local batch buffer. |
| `destroy()` | `void` | Flush pending events and release the batch timer. |
| `close()` | `void` | Alias for `destroy()`. |
| `getEvents(limit?)` | `Event[]` | List recent events. |
| `sendSimpleEvent(request)` | `ProcessEventResponse` | Send a simplified event (quick integration). |
| `sendStateChangeEvent(request)` | `ProcessEventResponse` | Send a typed state-change event (auto-updates state machines). |
| `sendTransactionEvent(request)` | `ProcessEventResponse` | Send a typed transaction event (auto-appends to ledgers). |
| `ingestConversations(request)` | `ConversationIngestResponse` | Ingest multi-session conversations into structured memory. |
| `queryConversations(question)` | `ConversationQueryResponse` | Query conversation-populated structured memory. |
| `search(query)` | `SearchResponse` | String shorthand — defaults to Hybrid mode. |
| `search(request)` | `SearchResponse` | Full search (Keyword/Semantic/Hybrid, fusion: RRF/Linear/Max). |
| `getClaims(options?)` | `ClaimResponse[]` | List active claims, filter by `eventId`. |
| `getClaimById(id)` | `ClaimResponse` | Get a single claim by ID. |
| `searchClaims(request)` | `ClaimSearchResponse[]` | Semantic search over claims. |
| `processEmbeddings(limit?)` | `EmbeddingsProcessResponse` | Generate embeddings for pending claims. |
| `getAgentMemories(agentId, limit?)` | `MemoryResponse[]` | Get memories for an agent. |
| `getContextMemories(context, request?)` | `MemoryResponse[]` | Find memories similar to a context. |
| `getAgentStrategies(agentId, limit?)` | `StrategyResponse[]` | Get strategies for an agent. |
| `getSimilarStrategies(request)` | `SimilarStrategyResponse[]` | Find strategies by multi-dimensional similarity. |
| `getActionSuggestions(contextHash, lastActionNode?, limit?)` | `ActionSuggestionResponse[]` | Get best next action suggestions. |
| `getEpisodes(limit?)` | `EpisodeResponse[]` | Get detected episodes. |
| `getAnalytics()` | `AnalyticsResponse` | Get graph analytics with learning metrics. |
| `getCommunities(algorithm?)` | `CommunityDetectionResponse` | Detect communities (`"louvain"` or `"label_propagation"`). |
| `getCentrality()` | `CentralityResponse` | Get node centrality scores. |
| `getPersonalizedPageRank(sourceNodeId, options?)` | `PPRResponse` | Personalized PageRank from a source node. |
| `getReachability(source, options?)` | `ReachabilityResponse` | Temporal reachability from a source node. |
| `getCausalPath(source, target)` | `CausalPathResponse` | Find causal path between two nodes. |
| `getIndexStats()` | `IndexStatsResponse[]` | Get property index performance stats. |
| `getGraph(query?)` | `GraphResponse` | Get graph structure for visualization. |
| `getGraphByContext(query)` | `GraphResponse` | Get context-anchored subgraph. |
| `queryGraphNodes(request)` | `GraphNodeQueryResponse` | Search graph nodes by properties. |
| `traverseGraph(query)` | `GraphTraverseResponse` | Traverse graph from a starting node. |
| `persistGraph()` | `GraphPersistResponse` | Flush in-memory graph state to disk. |
| `generateStrategies(request)` | `PlanningStrategiesResponse` | Generate strategy candidates for a goal. |
| `generateActions(request)` | `PlanningActionsResponse` | Generate action candidates for a strategy step. |
| `createPlan(request)` | `PlanningPlanResponse` | Full planning pipeline (strategies + actions). |
| `plan(goalDescription)` | `PlanningPlanResponse` | Shorthand for `createPlan()` with defaults. |
| `startExecution(request)` | `PlanningExecuteResponse` | Start execution tracking. |
| `validateEvent(request)` | `PlanningValidateResponse` | Validate event against predicted world state. |
| `getWorldModelStats()` | `WorldModelStatsResponse` | Get world model statistics. |
| `exportDatabase()` | `ArrayBuffer` | Export entire database as binary. |
| `importDatabase(data, mode?)` | `AdminImportResponse` | Import database (`"replace"` or `"merge"`). |
| `recallContext(opts)` | `RecallContextResult` | Parallel recall of strategies, memories, claims. |
| `perceiveActLearn(agentType, agentId, sessionId, opts)` | `PerceiveActLearnResult` | Full PAL cycle (recall → perceive → record). |
| `healthCheck()` | `HealthResponse` | Check system health. |
| `getStats()` | `StatsResponse` | Get system-wide statistics. |

### Builder Methods (21)

| Method | Description |
|--------|-------------|
| `.action(name, params)` | Define an Action event. |
| `.observation(type, data, options?)` | Define an Observation event. |
| `.context(text, type?)` | Define a Context event. |
| `.communication(messageType, sender, recipient, content)` | Define a Communication event. |
| `.cognitive(processType, input, output, reasoningTrace?)` | Define a Cognitive event. |
| `.learning(learningEvent)` | Define a Learning event. |
| `.outcome(result)` | Set action outcome to Success. |
| `.failure(error, errorCode?)` | Set action outcome to Failure. |
| `.partial(result, issues)` | Set action outcome to Partial. |
| `.retry(attempt, maxRetries)` | Attach retry metadata. |
| `.meta(key, value)` | Add a metadata key-value pair. |
| `.duration(ms)` | Set action duration in milliseconds. |
| `.semantic(enabled?)` | Enable/disable semantic indexing. |
| `.language(lang)` | Set language for Context events. |
| `.isCode(enabled?)` | Mark event as containing source code. |
| `.state(variables)` | Add environment variables. |
| `.goal(text, priority?, progress?)` | Add an active goal. |
| `.causedBy(parentId)` | Link to a parent event (causality). |
| `.build()` | Return the raw `Event` object. |
| `.send()` | Build and send (awaits server response). |
| `.enqueue()` | Build and queue (returns `LocalAck` immediately). |

---

## Error Handling

All API errors throw `MinnsError` with structured fields:

```typescript
import { MinnsError } from 'minns-sdk';

try {
  await client.processEvent(event);
} catch (err) {
  if (err instanceof MinnsError) {
    console.log(err.message);    // Human-readable error
    console.log(err.statusCode); // HTTP status (408 for timeout, 413 for payload too large, etc.)
    console.log(err.details);    // Optional server-provided details
  }
}
```

---

## Security & Resilience

- **Circular Reference Protection**: Detects and replaces with `"[Circular]"`.
- **Prototype Pollution Protection**: Strips `__proto__` and `constructor` during serialization.
- **BigInt Handling**: Automatically converts `BigInt` to string for Rust `DisplayFromStr` compatibility.
- **Payload Size Guard**: Rejects payloads exceeding `maxPayloadSize` (default 1MB).
- **Queue Backpressure**: `enqueue()` throws if local queue exceeds `maxQueueSize`.

---

## Telemetry

Fire-and-forget monitoring sent to `/api/telemetry`:

- **Collected**: Latency, status codes, error messages, estimated token counts.
- **Privacy**: Never includes request bodies or raw event content.
- **Opt-out**: Set `enableDefaultTelemetry: false` (the default).
- **Custom**: Pass `onTelemetry: (data) => { ... }` for your own handler.

---

## Numeric Field Flexibility

All numeric ID fields (`agent_id`, `session_id`, `goal_id`, timestamps) accept `number`, `string`, or `bigint`. This ensures compatibility between JavaScript and the Rust backend's `u128`/`u64` types.

```typescript
// All equivalent:
{ agentId: 2001 }
{ agentId: "2001" }
{ agentId: 2001n }
```

---

## Debug Mode

Enable `debug: true` in client config to log all HTTP traffic:

```
[Minns] POST /api/events
[Minns] Request Body: {"event":{...}}
[Minns] Response [200]: {"success":true,"nodes_created":5,...}
```

---

## License

MIT © 2026
