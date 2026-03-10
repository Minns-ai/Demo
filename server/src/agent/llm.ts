import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

export type LLMProvider = 'openai' | 'anthropic';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMOptions {
  provider?: LLMProvider;
  temperature?: number;
  maxTokens?: number;
}

let openai: OpenAI | null = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;
let anthropic: Anthropic | null = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;

/**
 * Reinitialize LLM clients with current config values.
 * Called after API keys are updated via the frontend.
 */
export function reinitLLM(): void {
  openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;
  anthropic = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;
  console.log(`[llm] Reinitialized — OpenAI: ${openai ? 'yes' : 'no'}, Anthropic: ${anthropic ? 'yes' : 'no'}`);
}

/**
 * Unified LLM completion that supports both OpenAI and Anthropic.
 * Extracts system messages for Anthropic's separate `system` parameter.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: LLMOptions = {}
): Promise<string> {
  const preferredProvider = opts.provider ?? config.defaultProvider;
  const provider: LLMProvider = preferredProvider === 'anthropic'
    ? (anthropic ? 'anthropic' : 'openai')
    : (openai ? 'openai' : 'anthropic');
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? 1024;

  if (provider === 'anthropic' && anthropic) {
    // Anthropic: extract system messages, convert rest to user/assistant
    const systemParts: string[] = [];
    const conversationMessages: { role: 'user' | 'assistant'; content: string }[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push(msg.content);
      } else {
        conversationMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // Anthropic requires alternating user/assistant. Merge consecutive same-role messages.
    const merged: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const msg of conversationMessages) {
      if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
        merged[merged.length - 1].content += '\n\n' + msg.content;
      } else {
        merged.push({ ...msg });
      }
    }

    // Ensure first message is from user
    if (merged.length === 0 || merged[0].role !== 'user') {
      merged.unshift({ role: 'user', content: '(start)' });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: systemParts.join('\n\n'),
      messages: merged,
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock?.text ?? '';
  }

  if (!openai) {
    throw new Error('No LLM provider configured. Please add an OpenAI or Anthropic API key.');
  }

  // Default: OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return completion.choices[0]?.message?.content ?? '';
}
