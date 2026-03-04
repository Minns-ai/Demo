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
  memory_type?: string;
  last_accessed?: number | string;
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
  counterfactual?: string;
  strategy_type?: string;
  support_count?: number;
  expected_success?: number;
  expected_cost?: number;
  expected_value?: number;
  precondition?: string;
  action_hint?: string;
}

export function getStrategies(agentId: number | string, limit = 20): Promise<StrategyItem[]> {
  return fetchJson(`/strategies/${agentId}?limit=${limit}`);
}

// ── Claims ──────────────────────────────────────────────────────────

export interface ClaimEntity {
  entity_text: string;
  entity_type: string;
  confidence: number;
}

export interface EvidenceSpan {
  source_text: string;
  start?: number;
  end?: number;
}

export interface ClaimItem {
  claim_id?: string | number;
  claim_text?: string;
  text?: string;
  claim_type?: string;
  subject_entity?: string;
  status?: string;
  confidence?: number;
  similarity?: number;
  support_count?: number;
  evidence_spans?: EvidenceSpan[];
  entities?: ClaimEntity[];
  created_at?: string | number;
  temporal_weight?: number;
  superseded_by?: string | number;
  [key: string]: unknown;
}

export async function getClaims(limit = 50): Promise<ClaimItem[]> {
  const data = await fetchJson<ClaimItem[] | Record<string, unknown>>(`/claims?limit=${limit}`);
  return Array.isArray(data) ? data : [];
}

export async function searchClaims(queryText: string, topK = 10): Promise<ClaimItem[]> {
  const data = await fetchJson<ClaimItem[] | Record<string, unknown>>('/claims/search', {
    method: 'POST',
    body: JSON.stringify({ query_text: queryText, top_k: topK }),
  });
  return Array.isArray(data) ? data : [];
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

// ── Config Status ────────────────────────────────────────────────

export interface ConfigStatus {
  minns_configured: boolean;
  openai_configured: boolean;
}

export function getConfigStatus(): Promise<ConfigStatus> {
  return fetchJson('/config/status');
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

// ── NLQ ──────────────────────────────────────────────────────────────

export interface NLQResponse {
  answer: string;
  intent: string;
  entities_resolved: { text: string; node_id: number; node_type: string; confidence: number }[];
  confidence: number;
  result_count: number;
  execution_time_ms: number;
  query_used: string;
  explanation: string[];
  total_count: number;
}

export function queryNLQ(question: string, opts?: { session_id?: string }): Promise<NLQResponse> {
  return fetchJson('/nlq', {
    method: 'POST',
    body: JSON.stringify({ question, ...opts }),
  });
}

// ── Structured Memory ────────────────────────────────────────────────

// SDK returns template as a discriminated union: { Ledger: {...} } | { StateMachine: {...} } | etc.
export type StructuredMemoryTemplate =
  | { Ledger: { entries: { amount: number; description: string; direction: string }[]; balance: number; provenance: string } }
  | { StateMachine: { current_state: string; history: { from: string; to: string; trigger: string }[]; provenance: string } }
  | { PreferenceList: { ranked_items: { item: string; rank: number; score: number }[]; provenance: string } }
  | { Tree: { nodes: Record<string, string[]>; provenance: string } };

export interface StructuredMemoryListResponse {
  keys: string[];
  count: number;
}

export interface StructuredMemoryGetResponse {
  key: string;
  template: StructuredMemoryTemplate;
}

export interface LedgerBalance {
  key: string;
  balance: number;
}

export interface StateCurrentResponse {
  key: string;
  current_state: string;
}

/** Extract the template type name from the discriminated union */
export function getTemplateType(template: StructuredMemoryTemplate): string {
  if ('Ledger' in template) return 'Ledger';
  if ('StateMachine' in template) return 'StateMachine';
  if ('PreferenceList' in template) return 'PreferenceList';
  if ('Tree' in template) return 'Tree';
  return 'Unknown';
}

/** Extract the inner data from the discriminated union */
export function getTemplateData(template: StructuredMemoryTemplate): unknown {
  if ('Ledger' in template) return template.Ledger;
  if ('StateMachine' in template) return template.StateMachine;
  if ('PreferenceList' in template) return template.PreferenceList;
  if ('Tree' in template) return template.Tree;
  return template;
}

export function listStructuredMemory(prefix?: string): Promise<StructuredMemoryListResponse> {
  const qs = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
  return fetchJson(`/structured-memory${qs}`);
}

export function getStructuredMemory(key: string): Promise<StructuredMemoryGetResponse> {
  return fetchJson(`/structured-memory/${encodeURIComponent(key)}`);
}

export function deleteStructuredMemory(key: string): Promise<{ success: boolean }> {
  return fetchJson(`/structured-memory/${encodeURIComponent(key)}`, { method: 'DELETE' });
}

export function upsertStructuredMemory(key: string, template: StructuredMemoryTemplate): Promise<{ success: boolean; key: string }> {
  return fetchJson('/structured-memory', {
    method: 'POST',
    body: JSON.stringify({ key, template }),
  });
}

export function appendLedgerEntry(key: string, entry: { amount: number; description: string; direction: 'Credit' | 'Debit' }): Promise<{ success: boolean; balance: number }> {
  return fetchJson(`/structured-memory/${encodeURIComponent(key)}/ledger`, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export function getLedgerBalance(key: string): Promise<LedgerBalance> {
  return fetchJson(`/structured-memory/${encodeURIComponent(key)}/ledger/balance`);
}

export function transitionState(key: string, req: { new_state: string; trigger: string }): Promise<{ success: boolean; new_state: string }> {
  return fetchJson(`/structured-memory/${encodeURIComponent(key)}/state`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export function getCurrentState(key: string): Promise<StateCurrentResponse> {
  return fetchJson(`/structured-memory/${encodeURIComponent(key)}/state`);
}

export function updatePreference(key: string, req: { item: string; rank: number; score: number }): Promise<{ success: boolean }> {
  return fetchJson(`/structured-memory/${encodeURIComponent(key)}/preference`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export function addTreeChild(key: string, req: { parent: string; child: string }): Promise<{ success: boolean }> {
  return fetchJson(`/structured-memory/${encodeURIComponent(key)}/tree`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// ── Events ───────────────────────────────────────────────────────────

export interface EventItem {
  event_id: string | number;
  event_type: string;
  timestamp: string;
  data: unknown;
}

export function getEvents(limit = 50): Promise<EventItem[]> {
  return fetchJson(`/events?limit=${limit}`);
}

// ── Admin ────────────────────────────────────────────────────────────

export function processEmbeddings(limit = 100): Promise<{ processed: number }> {
  return fetchJson('/admin/embeddings', {
    method: 'POST',
    body: JSON.stringify({ limit }),
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
