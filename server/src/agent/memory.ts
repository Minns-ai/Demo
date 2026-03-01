import { client } from '../minns/client.js';
import { config } from '../config.js';
import { MinnsError } from 'minns-sdk';
import type { MemoryResponse, ClaimSearchResponse, EventContext } from 'minns-sdk';

export async function getAgentMemories(limit = 10): Promise<MemoryResponse[]> {
  try {
    return await client.getAgentMemories(config.agentId, limit);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      console.error(`[minns:memory] getAgentMemories failed: ${err.message} [${err.statusCode}]`, err.details);
    }
    return [];
  }
}

export async function getContextMemories(context: EventContext, limit = 10): Promise<MemoryResponse[]> {
  try {
    return await client.getContextMemories(context, { limit, agent_id: config.agentId });
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      console.error(`[minns:memory] getContextMemories failed: ${err.message} [${err.statusCode}]`, err.details);
    }
    return [];
  }
}

export async function searchClaims(queryText: string, topK = 5): Promise<ClaimSearchResponse[]> {
  try {
    return await client.searchClaims({ query_text: queryText, top_k: topK });
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      console.error(`[minns:memory] searchClaims failed: ${err.message} [${err.statusCode}]`, err.details);
    }
    return [];
  }
}

/** Build a TimeOfDay object from the current system clock */
function getTimeOfDay(): { hour: number; minute: number; timezone: string } {
  const now = new Date();
  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/** Build EventContext for context-memory lookups with temporal + goal awareness */
export function buildEventContext(
  variables: Record<string, unknown> = {},
  goalDesc?: string,
): EventContext {
  return {
    environment: {
      variables,
      spatial: null,
      temporal: { time_of_day: getTimeOfDay(), deadlines: [], patterns: [] },
    },
    active_goals: goalDesc
      ? [{ id: 0, description: goalDesc, priority: 3, deadline: null, progress: 0, subgoals: [] }]
      : [],
    resources: {
      computational: { cpu_percent: 0, memory_bytes: 0, storage_bytes: 0, network_bandwidth: 0 },
      external: {},
    },
    embeddings: null,
  };
}
