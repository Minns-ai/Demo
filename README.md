# MINNS SDK Demo

A full-stack demo showcasing **minns-sdk** — the self-evolving agentic database. Ingest conversations, query with natural language, and search extracted claims — all through 3 core endpoints.

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

### 2. `query()` — Ask questions in plain English

Natural language query over the knowledge graph. Ask anything — MINNS classifies the intent, resolves entities, and returns a human-readable answer.

```typescript
const answer = await client.query("What do you know about this user?");

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
// claims[0].evidence_spans → [{ source_text: "Lily is allergic to nuts, so we need to be careful..." }]
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

API keys can also be entered through the UI on first launch.

## Architecture

```
demo/
├── server/          Express + TypeScript backend
│   └── src/
│       ├── minns/   SDK client initialization
│       ├── agent/   ReAct agent, events, memory, strategy, prompts
│       ├── routes/  REST API (14 endpoints wrapping SDK methods)
│       └── data/    Mock databases
└── client/          React + Vite + Tailwind frontend
    └── src/
        ├── pages/   Chat, Claims, Architecture + 7 more
        ├── components/ Reusable UI components
        └── api/     API client + React hooks
```

## Demo Flow

1. **Ingest** — A pre-loaded travel booking conversation is automatically ingested via `ingestConversations()`
2. **Query** — Ask natural language questions via `query()` — "What's the budget?", "Any dietary needs?", "Summarize this trip"
3. **Search** — Browse and search extracted claims via `searchClaims()` with confidence scores and evidence

The demo shows the full SDK response for every call — intent classification, entity resolution, confidence scores, and execution time.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MINNS_API_KEY` | Yes | Get one at [minns.ai](https://minns.ai) |
| `OPENAI_API_KEY` | One of these | OpenAI key (`sk-...`) |
| `ANTHROPIC_API_KEY` | One of these | Anthropic key (`sk-ant-...`) |
| `PORT` | No | Server port (default: 3001) |

## Tech Stack

- **Backend**: Express, TypeScript, minns-sdk, OpenAI / Anthropic
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Dev**: npm workspaces, concurrently, tsx
