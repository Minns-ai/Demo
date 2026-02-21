# minns-sdk Demo: Customer Service Agent

A full-stack demo showcasing every major feature of **minns-sdk** through a customer service agent that handles order tracking, returns/refunds, product inquiries, complaints, and account help.

## Quick Start

```bash
# 1. Install dependencies
cd demo
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your MINNS_API_KEY and OPENAI_API_KEY

# 3. Start both servers
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## Architecture

```
demo/
├── server/          Express + TypeScript backend
│   └── src/
│       ├── minns/   SDK client, intent specs, registry
│       ├── agent/   Core agent, events, memory, strategy, prompts
│       ├── handlers/ Domain handlers (orders, returns, products, complaints, account)
│       ├── routes/  REST API endpoints
│       └── data/    Mock databases
└── client/          React + Vite + Tailwind frontend
    └── src/
        ├── pages/   6 pages: Chat, Dashboard, Memories, Strategies, Graph, Claims
        ├── components/ Reusable UI components
        └── api/     Fetch client + React hooks
```

## SDK Feature Map

| # | SDK Feature | Where | How |
|---|------------|-------|-----|
| 1 | Fluent Event Builder | `agent/events.ts` | All 6 event types: `.action().outcome().state().goal().send()` |
| 2 | Three-Tier Memory | `agent/memory.ts` → Memories Page | `getAgentMemories()`, `getContextMemories()` by tier |
| 3 | Strategy System | `agent/strategy.ts` → Strategies Page | `getAgentStrategies()`, `getSimilarStrategies()`, `getActionSuggestions()` |
| 4 | Semantic Claims | `agent/agent.ts` → Claims Page | `.context(text).send({ enableSemantic: true })`, `searchClaims()` |
| 5 | Intent Sidecar | `agent/prompts.ts` | `buildSidecarInstruction()` + `extractIntentAndResponse()` |
| 6 | Intent Registry | `minns/registry.ts` | `registerForGoal()` per domain, `registerAgentFallback()`, `resolve()` |
| 7 | Graph Analytics | `routes/analytics.ts` → Graph Page | `getAnalytics()`, `getGraph()`, `traverseGraph()` |
| 8 | Cognitive Events | `agent/events.ts` | `.cognitive('Reasoning', input, output, trace)` per turn |
| 9 | Communication Events | `agent/events.ts` | `.communication()` for user/agent messages |
| 10 | Learning Events | `agent/events.ts` | MemoryRetrieved, StrategyServed, Outcome |
| 11 | Batching | `minns/client.ts` | `autoBatch: true`, `client.flush()` |
| 12 | Observation Events | Domain handlers | `.observation('order_lookup', data, { confidence, source })` |
| 13 | Health/Stats | `routes/health.ts` → Dashboard | `healthCheck()`, `getStats()` |
| 14 | Causality | `agent/agent.ts` | `.causedBy(parentEventId)` linking events |
| 15 | Goal Tracking | Throughout agent | `.goal(description, priority, progress)` |
| 16 | Telemetry | `minns/client.ts` | Custom `onTelemetry` callback |

## Pages

- **Chat** — 3-panel layout: Agent Brain (left) | Conversation (center) | Customer Context (right)
- **Dashboard** — Health status, processing stats, store metrics, learning metrics
- **Memories** — 3-column Episodic | Semantic | Schema browser
- **Strategies** — Strategy cards with quality scores and playbook viewer
- **Graph** — Force-directed graph visualization with analytics
- **Claims** — Semantic claim search with confidence scores

## Agent Pipeline

Each chat message triggers:

1. **Recall** — Fetch memories + context memories + search claims
2. **Strategize** — Fetch strategies + similar strategies + action suggestions
3. **Resolve** — `registry.resolve()` to pick intent spec by detected goal
4. **Build Prompt** — Inject memories, strategies, claims, sidecar instruction
5. **LLM Call** — OpenAI chat completion
6. **Parse Intent** — `extractIntentAndResponse()` from LLM output
7. **Dispatch** — Route to domain handler
8. **Emit Events** — Communication, Cognitive, Action, Observation, Context, Learning
9. **Flush** — `client.flush()` sends all batched events

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MINNS_API_KEY` | Yes | minns-sdk API key |
| `OPENAI_API_KEY` | Yes | OpenAI API key for LLM calls |
| `PORT` | No | Server port (default: 3001) |
| `AGENT_ID` | No | Agent ID (default: 1001) |
| `SESSION_ID` | No | Session ID (default: 1) |

## Tech Stack

- **Backend**: Express, TypeScript, minns-sdk, OpenAI
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, react-router-dom
- **Dev**: npm workspaces, concurrently, tsx
