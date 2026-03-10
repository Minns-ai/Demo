import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, '../../.env');
const MANAGED_KEYS = ['MINNS_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'LLM_PROVIDER', 'PORT', 'AGENT_ID', 'SESSION_ID'] as const;

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

function clean(value: string | undefined): string {
  return (value || '').trim();
}

function readManagedEnv(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};
  return dotenv.parse(readFileSync(ENV_PATH, 'utf-8'));
}

/**
 * Reloads managed config values from .env into in-memory config + process.env.
 * Returns true if any managed value changed.
 */
export function reloadConfigFromEnv(): boolean {
  const parsed = readManagedEnv();

  const next = {
    minnsApiKey: clean(parsed.MINNS_API_KEY),
    openaiApiKey: clean(parsed.OPENAI_API_KEY),
    anthropicApiKey: clean(parsed.ANTHROPIC_API_KEY),
    defaultProvider: ((parsed.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic'),
    port: parseInt(parsed.PORT || '3001', 10),
    agentId: parseInt(parsed.AGENT_ID || '1001', 10),
    sessionId: parseInt(parsed.SESSION_ID || '1', 10),
  };

  const changed =
    config.minnsApiKey !== next.minnsApiKey ||
    config.openaiApiKey !== next.openaiApiKey ||
    config.anthropicApiKey !== next.anthropicApiKey ||
    config.defaultProvider !== next.defaultProvider ||
    config.port !== next.port ||
    config.agentId !== next.agentId ||
    config.sessionId !== next.sessionId;

  if (!changed) return false;

  config.minnsApiKey = next.minnsApiKey;
  config.openaiApiKey = next.openaiApiKey;
  config.anthropicApiKey = next.anthropicApiKey;
  config.defaultProvider = next.defaultProvider;
  config.port = next.port;
  config.agentId = next.agentId;
  config.sessionId = next.sessionId;

  process.env.MINNS_API_KEY = next.minnsApiKey;
  process.env.OPENAI_API_KEY = next.openaiApiKey;
  process.env.ANTHROPIC_API_KEY = next.anthropicApiKey;
  process.env.LLM_PROVIDER = next.defaultProvider;
  process.env.PORT = String(next.port);
  process.env.AGENT_ID = String(next.agentId);
  process.env.SESSION_ID = String(next.sessionId);

  return true;
}

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
    const managed = new Set(MANAGED_KEYS);

    for (const line of existing.split('\n')) {
      const trimmed = line.trim();
      // Keep comments and blank lines
      if (trimmed === '' || trimmed.startsWith('#')) {
        lines.push(line);
        continue;
      }
      // Skip managed keys (we'll re-add them)
      const key = trimmed.split('=')[0]?.trim();
      if (key && managed.has(key as (typeof MANAGED_KEYS)[number])) continue;
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
