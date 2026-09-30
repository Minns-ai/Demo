# MINNS SDK Demo

A full-stack demo showcasing **minns-sdk** — the self-evolving agentic database. Ingest conversations, query with natural language, and search extracted claims — all through 3 core endpoints.

The app itself is a side-by-side comparison: it feeds the same multi-session conversation to MinnsDB, mem0, Zep and a plain vector RAG baseline, asks each one the same question and shows the answers next to each other.

The code samples below match the version of `minns-sdk` that this repo's `package-lock.json` installs (0.7.2). Later releases (0.8.x) changed some response shapes, so check the SDK's own README if you use a newer version.

## The 3 Core Endpoints

MINNS exposes three powerful endpoints that turn raw conversations into queryable structured knowledge:

### 1. `ingestConversations()` — Feed it conversations

Ingests raw conversation sessions. MINNS automatically extracts entities, relationships, facts, preferences, and state changes — building a knowledge graph behind the scenes.

```typescript
import { MinnsClient } from 'minns-sdk';

const client = new MinnsClient({ apiKey: process.env.MINNS_API_KEY });

const result = await client.ingestConversations({
  case_id: 'travel-booking-sarah-2024',
  sessions: [{
    session_id: 'session-1',
    topic: 'travel-planning',
    messages: [
      { role: 'user', content: "I'm planning a trip to the Amalfi Coast for my family." },
      { role: 'assistant', content: "Lovely! When are you thinking of traveling?" },
      { role: 'user', content: "Late June. Budget is €5,000. My daughter Lily is allergic to nuts." },
      // ... more messages
    ],
  }],
});

// result.messages_processed → 16
// result.relationships_found → 4
// result.state_changes_found → 2
```

**What happens under the hood:** MINNS parses each message, classifies it (transaction, state change, relationship, preference, or chitchat), extracts atomic claims, resolves entities, and wires everything into the knowledge graph.

### 2. `nlq()` — Ask questions in plain English

Natural language query over the knowledge graph. Ask anything — MINNS classifies the intent, resolves entities, and returns a human-readable answer.

```typescript
const answer = await client.nlq("What do you know about this user?");

// answer.answer → "Sarah lives in Manchester with her husband Tom and two children..."
// answer.intent → "entity_summary"
// answer.entities_resolved → [{ text: "Sarah", node_type: "Person", confidence: 0.97 }]
// answer.confidence → 0.94
// answer.explanation → ["Resolved 'user' to Sarah (Person node)", "Traversed family relationships", ...]
```

**Supported intents:** `FindNeighbors`, `FindPath`, `FilteredTraversal`, `Subgraph`, `TemporalChain`, `Ranking`, `SimilaritySearch`, `Aggregate`, `StructuredMemoryQuery`.

### 3. `searchClaims()` — Semantic search over extracted facts

Every fact MINNS extracts becomes a searchable claim with confidence scores, evidence spans, and entity links.

```typescript
const claims = await client.searchClaims({
  query_text: "dietary requirements",
  top_k: 5,
});

// claims[0].claim_text → "Lily is allergic to nuts"
// claims[0].confidence → 0.95
// claims[0].subject_entity → "Lily"
// claims[0].evidence_spans → [{ start: 0, end: 24, text: "Lily is allergic to nuts, so we need to be careful..." }]
```

**How it works:** Claims are embedded into a vector space. Queries are matched by cosine similarity, with BM25 keyword boosting for precision.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — add your MINNS_API_KEY and either OPENAI_API_KEY or ANTHROPIC_API_KEY

# 3. Start both servers
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

You need Node.js 20.19 or later (or 22.12 or later), which is what Vite 8 requires. The `.env` file must sit in the repository root, next to `package.json`; the server reads it from there.

If you start without keys, the server still runs and the frontend shows a setup dialog where you can enter your MINNS key and an LLM key. The dialog saves them to `.env`. The MinnsDB column of the comparison reads `MINNS_API_KEY` once when the server starts, so restart `npm run dev` after entering keys through the dialog.

The Vite dev server proxies `/api` to `http://localhost:3001` (see `client/vite.config.ts`), so if you change `PORT` you also need to change the proxy target there.

To run the production build on one port instead, as the `Dockerfile` does:

```bash
npm run build          # builds the client into client/dist
npm start -w server    # serves the API and the built client on http://localhost:3001
```

## Architecture

```
demo/
├── server/          Express + TypeScript backend
│   └── src/
│       ├── minns/   SDK client initialization
│       ├── agent/   ReAct agent, events, memory, strategy, prompts
│       ├── routes/  REST API wrapping SDK methods, plus /api/comparison/run
│       ├── otel/    Optional OpenTelemetry export
│       └── data/    Mock databases
└── client/          React + Vite + Tailwind frontend
    └── src/
        ├── pages/   ComparisonPage (the only page the app renders) + older unused pages
        ├── components/ Reusable UI components
        └── api/     API client + React hooks
```

## Demo Flow

1. **Pick a scenario and a question** on the comparison page, and choose which systems to run.
2. **Ingest**: the server sends the scenario's conversations to each system. For MinnsDB this is `ingestConversations()` under the case ID `comparison_<scenario id>`.
3. **Query**: each system answers the question. MinnsDB uses `nlq()`; mem0, Zep and the vector RAG baseline retrieve context and have `gpt-4o-mini` write the answer.
4. **Compare**: the answers and their latencies appear side by side.

A system whose key is missing does not stop the others; its column shows a message such as "(no ZEP_API_KEY configured)" instead of an answer.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MINNS_API_KEY` | Yes | Get one at [minns.ai](https://minns.ai) |
| `OPENAI_API_KEY` | One of these | OpenAI key (`sk-...`). The mem0, Zep and vector RAG columns of the comparison only work with an OpenAI key. `LLM_API_KEY` is accepted as a fallback name for those columns. |
| `ANTHROPIC_API_KEY` | One of these | Anthropic key (`sk-ant-...`) |
| `LLM_PROVIDER` | No | `openai` or `anthropic` (default: `openai`) |
| `ZEP_API_KEY` | No | Enables the Zep column of the comparison |
| `PORT` | No | Server port (default: 3001) |
| `AGENT_ID`, `SESSION_ID` | No | IDs passed to the MINNS client (defaults: 1001 and 1) |
| `OPTO_URL`, `OPTO_API_KEY` | No | When both are set, agent turns are exported as OpenTelemetry traces to this service |
| `OPTO_AGENT_NAME` | No | Service name for those traces (default: `shopify-support`) |
| `DEMO_ENABLE_SEED` | No | Set to `true` to seed workspace data on startup (off by default) |
| `MINNS_URL` | No | Base URL used by the older workspace tools (default: `http://localhost:3000`) |

## Tech Stack

- **Backend**: Express, TypeScript, minns-sdk, OpenAI / Anthropic, mem0ai, Zep Cloud
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Dev**: npm workspaces, concurrently, tsx
