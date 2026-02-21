import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  minnsApiKey: process.env.MINNS_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  agentId: parseInt(process.env.AGENT_ID || '1001', 10),
  sessionId: parseInt(process.env.SESSION_ID || '1', 10),
};
