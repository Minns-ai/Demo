import { Router } from 'express';
import { Memory } from 'mem0ai/oss';
import OpenAI from 'openai';

const router = Router();

const MINNS_BASE = process.env.MINNS_URL || 'http://localhost:3333';

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
  // Ingest all sessions
  const sessions = scenario.conversations.map((conv, i) => ({
    session_id: `${scenario.id}_s${i}`,
    timestamp: conv.date,
    topic: conv.session,
    messages: conv.messages,
  }));

  await fetch(`${MINNS_BASE}/api/conversations/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      case_id: `comparison_${scenario.id}`,
      sessions,
      include_assistant_facts: true,
    }),
  });

  // Wait for compaction to finish
  await new Promise(r => setTimeout(r, 2000));

  // Query
  const res = await fetch(`${MINNS_BASE}/api/nlq`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) return '(MinnsDB query failed)';
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

  // Add all messages
  for (const conv of scenario.conversations) {
    const messages = conv.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));
    try {
      await mem.add(messages, { userId: 'demo_user' } as any);
    } catch (e) {
      console.warn('[comparison] mem0 add failed:', (e as Error).message);
    }
  }

  // Search
  try {
    const results = await mem.search(question, { topK: 10, filters: { user_id: 'demo_user' } });
    const memories = (results as any)?.results || results || [];
    if (Array.isArray(memories) && memories.length > 0) {
      const context = memories
        .map((m: any) => m.memory || m.data?.memory || '')
        .filter(Boolean)
        .join('\n');

      // Use LLM to answer from retrieved memories
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
    }
    return '(no memories found)';
  } catch (e) {
    return `(mem0 search failed: ${(e as Error).message})`;
  }
}

// ── Vector RAG (OpenAI embeddings + cosine similarity) ─────────────

async function runVectorRAG(scenario: Scenario, question: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || '';
  if (!apiKey) return '(no OpenAI API key for Vector RAG)';

  const openai = new OpenAI({ apiKey });

  // Chunk conversations into messages
  const chunks: string[] = [];
  for (const conv of scenario.conversations) {
    for (const msg of conv.messages) {
      if (msg.role === 'user') {
        chunks.push(`[${conv.date}] ${msg.content}`);
      }
    }
  }

  // Embed all chunks
  const chunkEmbeddings = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
  });

  // Embed query
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });

  const queryVec = queryEmbedding.data[0].embedding;

  // Cosine similarity
  function cosine(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
  }

  // Rank and take top 5
  const scored = chunks.map((chunk, i) => ({
    chunk,
    score: cosine(queryVec, chunkEmbeddings.data[i].embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, 5).map(s => s.chunk);

  // LLM answer from retrieved chunks
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

router.post('/comparison/run', async (req, res) => {
  const { scenario, question }: { scenario: Scenario; question: string } = req.body;

  if (!scenario || !question) {
    res.status(400).json({ error: 'scenario and question required' });
    return;
  }

  const results: SystemAnswer[] = [];

  // Run all three in parallel
  const [minnsResult, mem0Result, ragResult] = await Promise.allSettled([
    (async () => {
      const start = Date.now();
      const answer = await runMinns(scenario, question);
      return { system: 'MinnsDB', answer, latency_ms: Date.now() - start };
    })(),
    (async () => {
      const start = Date.now();
      const answer = await runMem0(scenario, question);
      return { system: 'mem0', answer, latency_ms: Date.now() - start };
    })(),
    (async () => {
      const start = Date.now();
      const answer = await runVectorRAG(scenario, question);
      return { system: 'Vector RAG', answer, latency_ms: Date.now() - start };
    })(),
  ]);

  for (const r of [minnsResult, mem0Result, ragResult]) {
    if (r.status === 'fulfilled') {
      results.push(r.value);
    } else {
      results.push({ system: '?', answer: `Error: ${r.reason}`, latency_ms: 0 });
    }
  }

  res.json({ results });
});

export default router;
