import { client } from '../minns/client.js';
import { config } from '../config.js';
import { MinnsError } from 'minns-sdk';
import type { StrategyResponse, SimilarStrategyResponse, ActionSuggestionResponse } from 'minns-sdk';

export async function getAgentStrategies(limit = 10): Promise<StrategyResponse[]> {
  try {
    return await client.getAgentStrategies(config.agentId, limit);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      console.error(`[minns:strategy] getAgentStrategies failed: ${err.message} [${err.statusCode}]`, err.details);
    }
    return [];
  }
}

export async function getSimilarStrategies(goalIds?: (number | string)[], toolNames?: string[]): Promise<SimilarStrategyResponse[]> {
  try {
    return await client.getSimilarStrategies({
      goal_ids: goalIds,
      tool_names: toolNames,
      agent_id: config.agentId,
      limit: 5,
    });
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      console.error(`[minns:strategy] getSimilarStrategies failed: ${err.message} [${err.statusCode}]`, err.details);
    }
    return [];
  }
}

export async function getActionSuggestions(contextHash: number | string, limit = 5): Promise<ActionSuggestionResponse[]> {
  try {
    return await client.getActionSuggestions(contextHash, undefined, limit);
  } catch (err: unknown) {
    if (err instanceof MinnsError) {
      console.error(`[minns:strategy] getActionSuggestions failed: ${err.message} [${err.statusCode}]`, err.details);
    }
    return [];
  }
}
