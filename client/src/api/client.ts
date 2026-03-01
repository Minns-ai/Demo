import { useState, useEffect, useCallback } from 'react';

const BASE = '/api';

async function fetchJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Chat (SSE Streaming) ────────────────────────────────────────────

export interface AgentStep {
  type: 'recall' | 'think' | 'act' | 'observe' | 'reflect' | 'answer' | 'context' | 'suggest';
  // recall
  goal?: string;
  memories?: number;
  strategies?: number;
  claims?: number;
  // think
  thought?: string;
  action?: string;
  action_input?: Record<string, unknown>;
  decision?: string;
  // act
  result?: unknown;
  // observe
  observation?: string;
  // reflect — goal shift
  goalShift?: { from: string; to: string };
  // context — semantic event sent to MINNS
  contextType?: string;
  text?: string;
  // suggest — SDK action suggestions
  suggestions?: { action: string; confidence: number; reason: string }[];
  // answer
  reply?: string;
  intent?: {
    intent: string;
    slots: Record<string, string>;
    confidence?: number;
    claims_hint?: { text: string; type?: string; confidence?: number }[];
  };
  debug?: {
    memoriesRecalled: MemoryItem[];
    strategiesConsulted: StrategyItem[];
    claimsFound: ClaimItem[];
    eventsEmitted: string[];
    goalDesc: string | null;
  };
}

export type OnStepCallback = (step: AgentStep) => void;
export type OnDoneCallback = () => void;
export type OnErrorCallback = (error: string) => void;

/**
 * Try to recover a turn that was in-flight when the SSE connection dropped.
 * Returns true if recovery succeeded (steps were replayed), false if no turn exists.
 */
async function tryRecoverTurn(
  customerId: string,
  callbacks: { onStep: OnStepCallback; onDone: OnDoneCallback },
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/chat/turn/${customerId}`);
    if (!res.ok) return false;
    const turn = await res.json();
    if (turn.status === 'completed' || turn.status === 'in_flight') {
      for (const step of turn.steps) {
        callbacks.onStep(step as AgentStep);
      }
      if (turn.status === 'completed') {
        callbacks.onDone();
      }
      return true;
    }
  } catch {
    // Recovery failed — fall through to normal send
  }
  return false;
}

export async function sendMessageSSE(
  message: string,
  callbacks: {
    onStep: OnStepCallback;
    onDone: OnDoneCallback;
    onError?: OnErrorCallback;
  },
  customerId?: string
): Promise<void> {
  const cid = customerId || 'CUST-100';

  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, customerId: cid }),
  });

  if (!res.ok) {
    callbacks.onError?.(`API error: ${res.status}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError?.('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let receivedDone = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ') && currentEvent) {
          try {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === 'step') {
              callbacks.onStep(data as AgentStep);
            } else if (currentEvent === 'done') {
              receivedDone = true;
              callbacks.onDone();
            } else if (currentEvent === 'error') {
              callbacks.onError?.(data.error);
            }
          } catch {
            // Skip malformed JSON
          }
          currentEvent = '';
        } else if (line === '') {
          currentEvent = '';
        }
      }
    }

    // Process any remaining buffered data
    if (buffer.trim()) {
      const remaining = buffer.split('\n');
      let currentEvent = '';
      for (const line of remaining) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ') && currentEvent) {
          try {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === 'step') {
              callbacks.onStep(data as AgentStep);
            } else if (currentEvent === 'done') {
              receivedDone = true;
              callbacks.onDone();
            }
          } catch { /* skip */ }
          currentEvent = '';
        }
      }
    }
  } catch {
    // SSE stream broke — try to recover the turn from the server
    if (!receivedDone) {
      const recovered = await tryRecoverTurn(cid, callbacks);
      if (!recovered) {
        callbacks.onError?.('Connection lost and could not recover turn');
      }
    }
  }
}

// ── Memory ──────────────────────────────────────────────────────────

export interface MemoryItem {
  id: number | string;
  summary: string;
  takeaway: string;
  causal_note: string;
  tier: 'Episodic' | 'Semantic' | 'Schema';
  strength: number;
  outcome: string;
  relevance_score: number;
  access_count: number;
  formed_at: number | string;
  consolidation_status: string;
}

export function getMemories(agentId: number | string, limit = 20): Promise<MemoryItem[]> {
  return fetchJson(`/memories/${agentId}?limit=${limit}`);
}

// ── Strategy ────────────────────────────────────────────────────────

export interface PlaybookStep {
  step: number;
  action: string;
  condition: string;
  skip_if: string;
  recovery: string;
  branches: { condition: string; action: string }[];
}

export interface StrategyItem {
  id: number;
  name: string;
  summary: string;
  when_to_use: string;
  when_not_to_use: string;
  failure_modes: string[];
  playbook: PlaybookStep[];
  quality_score: number;
  success_count: number;
  failure_count: number;
  confidence: number;
  applicable_domains: string[];
}

export function getStrategies(agentId: number | string, limit = 20): Promise<StrategyItem[]> {
  return fetchJson(`/strategies/${agentId}?limit=${limit}`);
}

// ── Claims ──────────────────────────────────────────────────────────

export interface ClaimItem {
  claim_text?: string;
  text?: string;
  confidence?: number;
  similarity?: number;
  [key: string]: unknown;
}

export function getClaims(limit = 50): Promise<ClaimItem[]> {
  return fetchJson(`/claims?limit=${limit}`);
}

export function searchClaims(queryText: string, topK = 10): Promise<ClaimItem[]> {
  return fetchJson('/claims/search', {
    method: 'POST',
    body: JSON.stringify({ query_text: queryText, top_k: topK }),
  });
}

// ── Analytics ───────────────────────────────────────────────────────

export interface AnalyticsData {
  node_count: number;
  edge_count: number;
  connected_components: number;
  largest_component_size: number;
  average_path_length: number;
  diameter: number;
  clustering_coefficient: number;
  average_clustering: number;
  modularity: number;
  community_count: number;
  learning_metrics: {
    total_events: number;
    unique_contexts: number;
    learned_patterns: number;
    strong_memories: number;
    overall_success_rate: number;
    average_edge_weight: number;
  };
}

export function getAnalytics(): Promise<AnalyticsData> {
  return fetchJson('/analytics');
}

// ── Graph ───────────────────────────────────────────────────────────

export interface GraphNode {
  id: number;
  label: string;
  node_type: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: number;
  from: number;
  to: number;
  edge_type: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function getGraph(limit = 100): Promise<GraphData> {
  return fetchJson(`/graph?limit=${limit}`);
}

export function traverseGraph(start: string, maxDepth = 3): Promise<{ nodes: unknown[]; edges: unknown[] }> {
  return fetchJson(`/graph/traverse?start=${start}&max_depth=${maxDepth}`);
}

// ── Health & Stats ──────────────────────────────────────────────────

export interface HealthData {
  status: string;
  version: string;
  uptime_seconds: number;
  is_healthy: boolean;
  node_count: number;
  edge_count: number;
  processing_rate: number;
}

export interface StatsData {
  total_events_processed: number;
  total_nodes_created: number;
  total_episodes_detected: number;
  total_memories_formed: number;
  total_strategies_extracted: number;
  total_reinforcements_applied: number;
  average_processing_time_ms: number;
  stores: {
    memories: { total: number; avg_strength: number; avg_access_count: number; agents_with_memories: number };
    strategies: { total: number; high_quality: number; avg_quality: number; agents_with_strategies: number };
    claims: { total: number; embeddings_indexed: number };
    graph: { nodes: number; edges: number; avg_degree: number; largest_component: number };
  };
}

export function getHealth(): Promise<HealthData> {
  return fetchJson('/health');
}

export function getStats(): Promise<StatsData> {
  return fetchJson('/stats');
}

// ── Telemetry ────────────────────────────────────────────────────

export interface TelemetryEntry {
  type: string;
  method?: string;
  path?: string;
  duration_ms?: number;
  statusCode?: number;
  error?: string;
  timestamp?: number;
}

export function getTelemetry(): Promise<TelemetryEntry[]> {
  return fetchJson('/telemetry');
}

// ── Conversations ───────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationSession {
  session_id: string;
  topic: string;
  messages: ConversationMessage[];
}

export interface IngestRequest {
  case_id: string;
  sessions: ConversationSession[];
  include_assistant_facts?: boolean;
}

export interface IngestResponse {
  messages_processed: number;
  transactions_found: number;
  state_changes_found: number;
  relationships_found: number;
  chitchat_skipped: number;
}

export interface QueryResponse {
  answer: string;
  query_type: 'numeric' | 'state' | 'entity_summary' | 'preference' | 'relationship' | 'nlq';
  memory_context: unknown;
  related_memories: unknown[];
  related_strategies: unknown[];
}

export function ingestConversations(req: IngestRequest): Promise<IngestResponse> {
  return fetchJson('/conversations/ingest', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export function queryConversations(question: string, sessionId?: string): Promise<QueryResponse> {
  return fetchJson('/conversations/query', {
    method: 'POST',
    body: JSON.stringify({ question, sessionId }),
  });
}

// ── Hooks ───────────────────────────────────────────────────────────

export function useApiData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcher()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, deps);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}
