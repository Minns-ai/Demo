import { client } from '../minns/client.js';
import { config } from '../config.js';
import type { MemoryResponse, ClaimSearchResponse, EventContext } from 'minns-sdk';

export async function getAgentMemories(limit = 10): Promise<MemoryResponse[]> {
  try {
    return await client.getAgentMemories(config.agentId, limit);
  } catch {
    return [];
  }
}

export async function getContextMemories(context: EventContext, limit = 10): Promise<MemoryResponse[]> {
  try {
    return await client.getContextMemories(context, { limit, agent_id: config.agentId });
  } catch {
    return [];
  }
}

export async function searchClaims(queryText: string, topK = 5): Promise<ClaimSearchResponse[]> {
  try {
    return await client.searchClaims({ query_text: queryText, top_k: topK });
  } catch {
    return [];
  }
}

/** Build a minimal EventContext for context-memory lookups */
export function buildEventContext(variables: Record<string, unknown> = {}): EventContext {
  return {
    environment: {
      variables,
      spatial: null,
      temporal: { time_of_day: null, deadlines: [], patterns: [] },
    },
    active_goals: [],
    resources: {
      computational: { cpu_percent: 0, memory_bytes: 0, storage_bytes: 0, network_bandwidth: 0 },
      external: {},
    },
    embeddings: null,
  };
}
