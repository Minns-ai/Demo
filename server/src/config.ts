import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '../../.env');

dotenv.config({ path: ENV_PATH });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  minnsApiKey: process.env.MINNS_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  defaultProvider: (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic',
  agentId: parseInt(process.env.AGENT_ID || '1001', 10),
  sessionId: parseInt(process.env.SESSION_ID || '1', 10),
};

/**
 * Updates config in-memory and persists to .env file.
 */
export function updateConfig(updates: {
  minnsApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  defaultProvider?: 'openai' | 'anthropic';
}) {
  // Update in-memory config
  if (updates.minnsApiKey !== undefined) config.minnsApiKey = updates.minnsApiKey;
  if (updates.openaiApiKey !== undefined) config.openaiApiKey = updates.openaiApiKey;
  if (updates.anthropicApiKey !== undefined) config.anthropicApiKey = updates.anthropicApiKey;
  if (updates.defaultProvider !== undefined) config.defaultProvider = updates.defaultProvider;

  // Also update process.env so any future dotenv reads are consistent
  if (updates.minnsApiKey !== undefined) process.env.MINNS_API_KEY = updates.minnsApiKey;
  if (updates.openaiApiKey !== undefined) process.env.OPENAI_API_KEY = updates.openaiApiKey;
  if (updates.anthropicApiKey !== undefined) process.env.ANTHROPIC_API_KEY = updates.anthropicApiKey;
  if (updates.defaultProvider !== undefined) process.env.LLM_PROVIDER = updates.defaultProvider;

  // Write to .env file
  writeEnvFile();
}

function writeEnvFile() {
  const lines: string[] = [];

  // Read existing .env to preserve comments and unknown keys
  if (existsSync(ENV_PATH)) {
    const existing = readFileSync(ENV_PATH, 'utf-8');
    const managed = new Set(['MINNS_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'LLM_PROVIDER', 'PORT', 'AGENT_ID', 'SESSION_ID']);

    for (const line of existing.split('\n')) {
      const trimmed = line.trim();
      // Keep comments and blank lines
      if (trimmed === '' || trimmed.startsWith('#')) {
        lines.push(line);
        continue;
      }
      // Skip managed keys (we'll re-add them)
      const key = trimmed.split('=')[0]?.trim();
      if (key && managed.has(key)) continue;
      // Keep unknown keys
      lines.push(line);
    }
  }

  // Add managed keys
  lines.push(`MINNS_API_KEY=${config.minnsApiKey}`);
  if (config.openaiApiKey) lines.push(`OPENAI_API_KEY=${config.openaiApiKey}`);
  if (config.anthropicApiKey) lines.push(`ANTHROPIC_API_KEY=${config.anthropicApiKey}`);
  lines.push(`LLM_PROVIDER=${config.defaultProvider}`);
  lines.push(`PORT=${config.port}`);
  lines.push(`AGENT_ID=${config.agentId}`);
  lines.push(`SESSION_ID=${config.sessionId}`);

  writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf-8');
}
