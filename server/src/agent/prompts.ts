import type { MemoryResponse, StrategyResponse, ClaimSearchResponse, IntentSpec } from 'minns-sdk';
import { buildSidecarInstruction } from 'minns-sdk';

export function buildSystemPrompt(opts: {
  memories: MemoryResponse[];
  strategies: StrategyResponse[];
  claims: ClaimSearchResponse[];
  spec: IntentSpec | null;
  customerName?: string;
  customerId?: string;
}): string {
  const sections: string[] = [];

  sections.push(`You are a world-class customer service agent for TechGear, a premium electronics retailer.
Be warm, professional, and solution-oriented. Always address the customer by name when available.
If you need an order ID or product ID, ask politely.`);

  if (opts.customerName) {
    sections.push(`\n## Current Customer\nName: ${opts.customerName}\nID: ${opts.customerId}`);
  }

  if (opts.memories.length > 0) {
    const memList = opts.memories.slice(0, 5).map(m =>
      `- [${m.tier}] ${m.summary} (strength: ${m.strength.toFixed(2)})`
    ).join('\n');
    sections.push(`\n## Relevant Memories\n${memList}`);
  }

  if (opts.strategies.length > 0) {
    const stratList = opts.strategies.slice(0, 3).map(s =>
      `- ${s.name}: ${s.summary} (quality: ${s.quality_score.toFixed(2)})`
    ).join('\n');
    sections.push(`\n## Available Strategies\n${stratList}`);
  }

  if (opts.claims.length > 0) {
    const claimList = opts.claims.slice(0, 5).map((c: any) =>
      `- ${c.claim_text || c.text || JSON.stringify(c)}`
    ).join('\n');
    sections.push(`\n## Known Claims\n${claimList}`);
  }

  if (opts.spec) {
    const sidecar = buildSidecarInstruction(opts.spec);
    sections.push(`\n## Intent Classification\n${sidecar}`);
  }

  return sections.join('\n');
}
