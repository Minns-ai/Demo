// Side-by-side comparison of memory systems on the same scenario:
//
//   • MinnsDB   — our hosted product at api.minns.ai
//   • mem0      — mem0ai/oss with OpenAI provider, in-memory vector store
//   • Zep       — Zep Cloud (graph-based memory)
//   • Vector RAG — naive baseline: OpenAI embeddings + cosine + LLM synth
//
// Each system has the same contract: takes a Scenario (multi-session
// conversation history) plus a question, returns a final string answer.
// Runs are parallel and per-system failures are isolated so one bad provider
// doesn't poison the whole comparison.
//
// TODO: add Cognee. They don't ship a JS SDK so we'd talk to their cloud
// HTTP API directly. Tracked but not in this revision.

import { Router } from 'express';
import { Memory } from 'mem0ai/oss';
import OpenAI from 'openai';

const router = Router();

// MinnsDB is the hosted product — talking to api.minns.ai authenticated by
// the same MINNS_API_KEY the rest of the demo uses. The previous default
// (localhost:3333) was a leftover from when this route ran against a local
// dev instance.
const MINNS_BASE = process.env.MINNS_URL || 'https://api.minns.ai';
const MINNS_API_KEY = process.env.MINNS_API_KEY || '';

interface Message { role: string; content: string; }
interface Session { session: string; date: string; messages: Message[]; }
interface Question { question: string; expected: string; }
interface Scenario { id: string; conversations: Session[]; questions: Question[]; }

interface SystemAnswer {
  system: string;
  answer: string;
  latency_ms: number;
}

// ── MinnsDB ────────────────────────────────────────────────────────

async function runMinns(scenario: Scenario, question: string): Promise<string> {
  if (!MINNS_API_KEY) return '(no MINNS_API_KEY configured)';

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${MINNS_API_KEY}`,
  };

  // Ingest every session for this scenario. case_id scopes the ingest so
  // a re-run of the same scenario doesn't bleed into unrelated cases.
  const sessions = scenario.conversations.map((conv, i) => ({
    session_id: `${scenario.id}_s${i}`,
    timestamp: conv.date,
    topic: conv.session,
    messages: conv.messages,
  }));

  const ingestRes = await fetch(`${MINNS_BASE}/api/conversations/ingest`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      case_id: `comparison_${scenario.id}`,
      sessions,
      include_assistant_facts: true,
    }),
  });
  if (!ingestRes.ok) {
    const text = await ingestRes.text().catch(() => '');
    return `(MinnsDB ingest failed: HTTP ${ingestRes.status} ${text.slice(0, 120)})`;
  }

  // Give the pipeline a moment to compact memories before querying.
  await new Promise((r) => setTimeout(r, 2000));

  const res = await fetch(`${MINNS_BASE}/api/nlq`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return `(MinnsDB query failed: HTTP ${res.status} ${text.slice(0, 120)})`;
  }
  const data = await res.json();
  return data.answer || '(no answer)';
}

// ── mem0 OSS ───────────────────────────────────────────────────────

async function runMem0(scenario: Scenario, question: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || '';
  if (!apiKey) return '(no OpenAI API key for mem0)';

  const mem = new Memory({
    embedder: {
      provider: 'openai',
      config: { apiKey, model: 'text-embedding-3-small' },
    },
    vectorStore: {
      provider: 'memory',
      config: { collectionName: `comparison_${scenario.id}_${Date.now()}` },
    },
    llm: {
      provider: 'openai',
      config: { apiKey, model: 'gpt-4o-mini' },
    },
    disableHistory: true,
  });

  for (const conv of scenario.conversations) {
    const messages = conv.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    try {
      await mem.add(messages, { userId: 'demo_user' } as any);
    } catch (e) {
      console.warn('[comparison] mem0 add failed:', (e as Error).message);
    }
  }

  try {
    const results = await mem.search(question, { topK: 10, filters: { user_id: 'demo_user' } });
    const memories = (results as any)?.results || results || [];
    if (!Array.isArray(memories) || memories.length === 0) return '(no memories found)';

    const context = memories
      .map((m: any) => m.memory || m.data?.memory || '')
      .filter(Boolean)
      .join('\n');

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [
        { role: 'system', content: `Answer the question using ONLY these retrieved memories:\n\n${context}\n\nIf the memories are contradictory, state both facts.` },
        { role: 'user', content: question },
      ],
    });
    return completion.choices[0]?.message?.content || '(no answer)';
  } catch (e) {
    return `(mem0 search failed: ${(e as Error).message})`;
  }
}

// ── Zep Cloud ──────────────────────────────────────────────────────

async function runZep(scenario: Scenario, question: string): Promise<string> {
  const zepApiKey = process.env.ZEP_API_KEY || '';
  if (!zepApiKey) return '(no ZEP_API_KEY configured)';
  const openaiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || '';
  if (!openaiKey) return '(no OpenAI key for Zep answer synthesis)';

  // Lazy import so Zep's bundle doesn't load at module-init (and so missing
  // creds in a non-Zep run don't pay the import cost).
  const { ZepClient } = await import('@getzep/zep-cloud');
  const client = new ZepClient({ apiKey: zepApiKey });

  // Fresh user + thread per run so a re-run of the same scenario doesn't
  // accumulate state in Zep's graph. Best-effort cleanup at the end.
  const userId = `cmp_${scenario.id}_${Date.now()}`;
  const threadId = `thr_${userId}`;

  try {
    try { await (client as any).user.add({ userId, email: `${userId}@example.com` }); } catch { /* idempotent */ }
    try { await (client as any).thread.create({ threadId, userId }); } catch { /* idempotent */ }

    for (const conv of scenario.conversations) {
      const messages = conv.messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
      try {
        await (client as any).thread.addMessages(threadId, { messages });
      } catch (e) {
        console.warn('[comparison] Zep addMessages failed:', (e as Error).message);
      }
    }

    // Let Zep build the graph; their docs note an eventually-consistent step.
    await new Promise((r) => setTimeout(r, 2000));

    // Pull the synthesised context Zep computes for this thread.
    let context = '';
    try {
      const userContext = await (client as any).thread.getUserContext(threadId);
      context = userContext?.context || userContext?.summary?.content || '';
    } catch (e) {
      return `(Zep context fetch failed: ${(e as Error).message})`;
    }
    if (!context) return '(Zep returned no context)';

    const openai = new OpenAI({ apiKey: openaiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [
        { role: 'system', content: `Answer the question using ONLY this context from Zep:\n\n${context}` },
        { role: 'user', content: question },
      ],
    });
    return completion.choices[0]?.message?.content || '(no answer)';
  } catch (e) {
    return `(Zep error: ${(e as Error).message})`;
  } finally {
    // Cleanup — best effort, never blocks the response. Skipping cleanup is
    // safe; it just leaves rows in Zep with a timestamped userId.
    try { await (client as any).user.delete(userId); } catch { /* ignore */ }
  }
}

// ── Vector RAG (OpenAI embeddings + cosine similarity) ─────────────

async function runVectorRAG(scenario: Scenario, question: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || '';
  if (!apiKey) return '(no OpenAI API key for Vector RAG)';

  const openai = new OpenAI({ apiKey });

  const chunks: string[] = [];
  for (const conv of scenario.conversations) {
    for (const msg of conv.messages) {
      if (msg.role === 'user') {
        chunks.push(`[${conv.date}] ${msg.content}`);
      }
    }
  }

  const chunkEmbeddings = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
  });

  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });

  const queryVec = queryEmbedding.data[0].embedding;

  function cosine(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
  }

  const scored = chunks.map((chunk, i) => ({
    chunk,
    score: cosine(queryVec, chunkEmbeddings.data[i].embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, 5).map((s) => s.chunk);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 200,
    messages: [
      { role: 'system', content: `Answer the question using ONLY these retrieved passages:\n\n${topChunks.join('\n')}\n\nIf passages contain contradictory information, state what you found.` },
      { role: 'user', content: question },
    ],
  });

  return completion.choices[0]?.message?.content || '(no answer)';
}

// ── Endpoint ───────────────────────────────────────────────────────

// `systems` (optional) lets the frontend toggle which competitors run. If
// omitted, every system runs. Per-system failures land as a string answer
// in the result — never an HTTP 500 — so one provider being down doesn't
// take the whole comparison with it.
router.post('/comparison/run', async (req, res) => {
  const { scenario, question, systems }: {
    scenario: Scenario;
    question: string;
    systems?: string[];
  } = req.body;

  if (!scenario || !question) {
    res.status(400).json({ error: 'scenario and question required' });
    return;
  }

  const enabled = (name: string) => !systems || systems.length === 0 || systems.includes(name);

  const runs: Array<{ system: string; promise: Promise<SystemAnswer> }> = [];
  const timed = async (system: string, fn: () => Promise<string>): Promise<SystemAnswer> => {
    const start = Date.now();
    try {
      const answer = await fn();
      return { system, answer, latency_ms: Date.now() - start };
    } catch (e) {
      return { system, answer: `(error: ${(e as Error).message})`, latency_ms: Date.now() - start };
    }
  };

  if (enabled('MinnsDB')) runs.push({ system: 'MinnsDB', promise: timed('MinnsDB', () => runMinns(scenario, question)) });
  if (enabled('mem0')) runs.push({ system: 'mem0', promise: timed('mem0', () => runMem0(scenario, question)) });
  if (enabled('Zep')) runs.push({ system: 'Zep', promise: timed('Zep', () => runZep(scenario, question)) });
  if (enabled('Vector RAG')) runs.push({ system: 'Vector RAG', promise: timed('Vector RAG', () => runVectorRAG(scenario, question)) });

  const settled = await Promise.allSettled(runs.map((r) => r.promise));
  const results: SystemAnswer[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    return { system: runs[i].system, answer: `(unhandled error: ${s.reason})`, latency_ms: 0 };
  });

  res.json({ results });
});

export default router;
