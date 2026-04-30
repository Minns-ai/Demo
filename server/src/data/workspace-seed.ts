import { client } from '../minns/client.js';
import { config } from '../config.js';

const MINNS_BASE = process.env.MINNS_URL || 'http://localhost:3000';
const AGENT_TYPE = 'workspace-assistant';

async function minnsPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${MINNS_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 409) return null; // already exists
    throw new Error(`${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function seedTables(): Promise<void> {
  console.log('[seed] Creating temporal tables...');

  // ── Deals table ──
  try {
    await minnsPost('/api/tables', {
      name: 'deals',
      columns: [
        { name: 'name', col_type: 'String', nullable: false },
        { name: 'stage', col_type: 'String', nullable: false },
        { name: 'value', col_type: 'String', nullable: false },
        { name: 'owner', col_type: 'String', nullable: false },
        { name: 'updated_at', col_type: 'String', nullable: true },
      ],
    });
  } catch { /* table may exist */ }

  const deals = [
    ['Acme Corp', 'Negotiation', '$85,000', 'Sarah Chen', '2026-04-25'],
    ['BlockFi', 'Proposal', '$120,000', 'Tom Rivera', '2026-04-27'],
    ['ClearPath', 'Closed Won', '$45,000', 'Sarah Chen', '2026-04-20'],
    ['DataVault', 'Discovery', '$200,000', 'You', '2026-04-28'],
  ];

  for (const values of deals) {
    try {
      await minnsPost('/api/tables/deals/rows', { values });
    } catch { /* row may exist */ }
  }

  // ── Projects table ──
  try {
    await minnsPost('/api/tables', {
      name: 'projects',
      columns: [
        { name: 'name', col_type: 'String', nullable: false },
        { name: 'status', col_type: 'String', nullable: false },
        { name: 'owner', col_type: 'String', nullable: false },
        { name: 'deadline', col_type: 'String', nullable: true },
        { name: 'priority', col_type: 'String', nullable: true },
      ],
    });
  } catch { /* table may exist */ }

  const projects = [
    ['Q3 Product Launch', 'In Progress', 'You', '2026-06-15', 'High'],
    ['API Redesign', 'Planning', 'Tom Rivera', '2026-07-01', 'Medium'],
    ['SOC2 Audit', 'Blocked', 'Sarah Chen', '2026-05-30', 'Critical'],
  ];

  for (const values of projects) {
    try {
      await minnsPost('/api/tables/projects/rows', { values });
    } catch { /* row may exist */ }
  }

  // ── Team table ──
  try {
    await minnsPost('/api/tables', {
      name: 'team',
      columns: [
        { name: 'name', col_type: 'String', nullable: false },
        { name: 'role', col_type: 'String', nullable: false },
        { name: 'department', col_type: 'String', nullable: false },
        { name: 'status', col_type: 'String', nullable: true },
      ],
    });
  } catch { /* table may exist */ }

  const team = [
    ['Sarah Chen', 'Account Executive', 'Sales', 'Active'],
    ['Tom Rivera', 'Senior Engineer', 'Engineering', 'Active'],
    ['You', 'Team Lead', 'Product', 'Active'],
  ];

  for (const values of team) {
    try {
      await minnsPost('/api/tables/team/rows', { values });
    } catch { /* row may exist */ }
  }

  console.log('[seed] Temporal tables seeded.');
}

async function seedConversations(): Promise<void> {
  console.log('[seed] Ingesting past conversations...');

  const bc = { agentId: config.agentId, sessionId: config.sessionId, enableSemantic: true };

  // Seed knowledge facts via context events
  const facts = [
    'The Q3 product launch is targeting June 15. The main risk is the SOC2 audit which is currently blocked waiting on external auditor availability.',
    'Tom Rivera mentioned the API redesign might need an extra sprint. He raised concerns about backwards compatibility with existing integrations.',
    'Sarah Chen closed the ClearPath deal for $45,000 last week. She is now focused on moving Acme Corp from Negotiation to Closed Won.',
    'The team uses bullet-point summaries for weekly pipeline reviews. The user prefers concise, data-driven updates.',
    'DataVault is a new opportunity worth $200,000 in the Discovery stage. The user is personally managing this deal.',
    'The SOC2 audit deadline is May 30. If it slips, the Q3 launch timeline is at risk because several enterprise customers require SOC2 compliance.',
    'BlockFi deal moved from Discovery to Proposal last week. Tom Rivera is leading the technical evaluation.',
    'The user manages a team of three: Sarah Chen in Sales, Tom Rivera in Engineering, and themselves as Team Lead in Product.',
  ];

  for (const text of facts) {
    try {
      await client.event(AGENT_TYPE, bc).context(text, 'fact').send();
    } catch { /* non-fatal */ }
  }

  // Ingest structured conversation sessions
  try {
    await client.ingestConversations({
      case_id: 'workspace-history',
      sessions: [
        {
          session_id: 'session-q3-planning',
          topic: 'Q3 launch planning and SOC2 concerns',
          messages: [
            { role: 'user', content: 'How is the Q3 launch looking? I am worried about the SOC2 audit blocking us.' },
            { role: 'assistant', content: 'The Q3 launch is on track for June 15, but the SOC2 audit is the key dependency. Sarah is waiting on the external auditor to confirm their availability for late May.' },
            { role: 'user', content: 'What happens if SOC2 slips past May 30?' },
            { role: 'assistant', content: 'Several enterprise deals including DataVault require SOC2 compliance. A slip would push the launch to Q4 and risk $200k+ in pipeline.' },
          ],
        },
        {
          session_id: 'session-pipeline-review',
          topic: 'Weekly deal pipeline review',
          messages: [
            { role: 'user', content: 'Give me the pipeline summary for this week.' },
            { role: 'assistant', content: '- Acme Corp: Negotiation, $85k (Sarah)\n- BlockFi: moved to Proposal, $120k (Tom)\n- ClearPath: Closed Won, $45k (Sarah)\n- DataVault: Discovery, $200k (You)\n\nTotal pipeline: $450k. ClearPath closed this week.' },
            { role: 'user', content: 'I prefer bullet points like that, keep doing it that way.' },
            { role: 'assistant', content: 'Noted — I will use bullet-point format for pipeline summaries going forward.' },
          ],
        },
        {
          session_id: 'session-api-redesign',
          topic: 'API redesign timeline concerns',
          messages: [
            { role: 'user', content: 'Tom said the API redesign might slip. What is the current status?' },
            { role: 'assistant', content: 'Tom flagged that backwards compatibility with existing integrations is more complex than expected. He estimates needing one additional sprint, pushing the deadline from July 1 to approximately July 15.' },
            { role: 'user', content: 'Set up a weekly check-in with Tom on this. I want updates every Monday.' },
            { role: 'assistant', content: 'Done. I will remind you every Monday to check in with Tom on the API redesign progress.' },
          ],
        },
      ],
      include_assistant_facts: true,
    });
  } catch (e) {
    console.warn('[seed] Conversation ingest failed (LLM may not be configured):', (e as Error).message);
  }

  console.log('[seed] Past conversations ingested.');
}

async function seedStructuredMemory(): Promise<void> {
  console.log('[seed] Setting up structured memory...');

  try {
    await client.upsertStructuredMemory({
      key: 'user_preferences',
      template: {
        PreferenceList: {
          ranked_items: [
            { item: 'bullet-point summaries', rank: 1, score: 0.95 },
            { item: 'concise data-driven updates', rank: 2, score: 0.9 },
            { item: 'proactive risk alerts', rank: 3, score: 0.85 },
          ],
          provenance: 'Manual',
        },
      },
    });
  } catch { /* non-fatal */ }

  try {
    await client.upsertStructuredMemory({
      key: 'q3_launch',
      template: {
        StateMachine: {
          current_state: 'in_progress',
          history: [
            { from: 'planning', to: 'in_progress', trigger: 'kickoff' },
          ],
          provenance: 'Manual',
        },
      },
    });
  } catch { /* non-fatal */ }

  console.log('[seed] Structured memory configured.');
}

let seeded = false;

export async function seedWorkspaceData(): Promise<void> {
  if (seeded) return;
  seeded = true;

  try {
    // Check if data already exists
    const res = await fetch(`${MINNS_BASE}/api/tables/deals/rows?limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data.rows && data.rows.length > 0) {
        console.log('[seed] Workspace data already exists, skipping seed.');
        return;
      }
    }
  } catch {
    // Tables don't exist yet — proceed with seeding
  }

  await seedTables();
  await seedConversations();
  await seedStructuredMemory();

  console.log('[seed] Workspace seeding complete.');
}

/**
 * Simulate a live deal update after a delay.
 * Called on startup — fires a table update after 45 seconds
 * to trigger a WebSocket subscription delta during the demo.
 */
export function scheduleLiveUpdate(): void {
  setTimeout(async () => {
    console.log('[seed] Firing scheduled live update: BlockFi → Negotiation');
    try {
      // Get current BlockFi row
      const res = await fetch(`${MINNS_BASE}/api/tables/deals/rows?limit=10`);
      if (!res.ok) return;
      const data = await res.json();
      const blockfi = data.rows?.find((r: { values: string[] }) => r.values[0] === 'BlockFi');
      if (blockfi) {
        await fetch(`${MINNS_BASE}/api/tables/deals/rows/${blockfi.row_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            values: ['BlockFi', 'Negotiation', '$120,000', 'Tom Rivera', '2026-04-29'],
          }),
        });
        console.log('[seed] Live update sent: BlockFi deal stage → Negotiation');
      }
    } catch (e) {
      console.warn('[seed] Live update failed:', (e as Error).message);
    }
  }, 45_000);
}
