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

// ── Chat ────────────────────────────────────────────────────────────

export interface ChatResponse {
  reply: string;
  intent: {
    intent: string;
    slots: Record<string, string>;
    confidence?: number;
    claims_hint?: { text: string; type?: string; confidence?: number }[];
    goal_updates?: { goal: string; progress?: number }[];
  };
  handlerResult: { response: string; data?: unknown; observationType?: string } | null;
  debug: {
    memoriesRecalled: MemoryItem[];
    strategiesConsulted: StrategyItem[];
    claimsFound: ClaimItem[];
    actionSuggestions: unknown[];
    eventsEmitted: string[];
    goalDesc: string | null;
    goalProgress: number;
  };
}

export function sendMessage(message: string, customerId?: string): Promise<ChatResponse> {
  return fetchJson('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, customerId }),
  });
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
