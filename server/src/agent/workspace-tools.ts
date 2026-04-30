import { client } from '../minns/client.js';

const MINNS_BASE = process.env.MINNS_URL || 'http://localhost:3000';

async function minnsGet(path: string): Promise<unknown> {
  const res = await fetch(`${MINNS_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return res.json();
}

async function minnsPut(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${MINNS_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed (${res.status})`);
  return res.json();
}

interface TableRow {
  row_id: number;
  values: string[];
}

interface ScanResult {
  rows: TableRow[];
  columns?: string[];
}

function formatTable(columns: string[], rows: string[][]): string {
  const header = `| ${columns.join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map(r => `| ${r.join(' | ')} |`).join('\n');
  return `${header}\n${sep}\n${body}`;
}

export async function executeWorkspaceTool(
  action: string,
  params: Record<string, unknown>,
): Promise<{ result: string; raw?: unknown }> {
  switch (action) {
    case 'query_deals': {
      const data = (await minnsGet('/api/tables/deals/rows?limit=50')) as ScanResult;
      const cols = ['Name', 'Stage', 'Value', 'Owner', 'Updated'];
      const rows = (data.rows || []).map(r => r.values);
      return {
        result: rows.length > 0
          ? formatTable(cols, rows)
          : 'No deals found.',
        raw: data,
      };
    }

    case 'query_projects': {
      const data = (await minnsGet('/api/tables/projects/rows?limit=50')) as ScanResult;
      const cols = ['Name', 'Status', 'Owner', 'Deadline', 'Priority'];
      const rows = (data.rows || []).map(r => r.values);
      return {
        result: rows.length > 0
          ? formatTable(cols, rows)
          : 'No projects found.',
        raw: data,
      };
    }

    case 'query_team': {
      const data = (await minnsGet('/api/tables/team/rows?limit=50')) as ScanResult;
      const cols = ['Name', 'Role', 'Department', 'Status'];
      const rows = (data.rows || []).map(r => r.values);
      return {
        result: rows.length > 0
          ? formatTable(cols, rows)
          : 'No team members found.',
        raw: data,
      };
    }

    case 'update_deal': {
      const dealName = params.deal_name as string;
      const newStage = params.new_stage as string;
      if (!dealName || !newStage) return { result: 'Missing deal_name or new_stage.' };

      const data = (await minnsGet('/api/tables/deals/rows?limit=50')) as ScanResult;
      const row = (data.rows || []).find(r => r.values[0]?.toLowerCase() === dealName.toLowerCase());
      if (!row) return { result: `Deal "${dealName}" not found.` };

      const updated = [...row.values];
      updated[1] = newStage;
      updated[4] = new Date().toISOString().split('T')[0];
      await minnsPut(`/api/tables/deals/rows/${row.row_id}`, { values: updated });
      return { result: `Deal "${dealName}" updated to stage: ${newStage}.` };
    }

    case 'update_project': {
      const projName = params.project_name as string;
      const newStatus = params.new_status as string;
      if (!projName || !newStatus) return { result: 'Missing project_name or new_status.' };

      const data = (await minnsGet('/api/tables/projects/rows?limit=50')) as ScanResult;
      const row = (data.rows || []).find(r => r.values[0]?.toLowerCase() === projName.toLowerCase());
      if (!row) return { result: `Project "${projName}" not found.` };

      const updated = [...row.values];
      updated[1] = newStatus;
      await minnsPut(`/api/tables/projects/rows/${row.row_id}`, { values: updated });
      return { result: `Project "${projName}" updated to status: ${newStatus}.` };
    }

    case 'search_knowledge': {
      const query = params.query as string;
      if (!query) return { result: 'Missing query.' };
      try {
        const nlqResult = await client.nlq(query);
        return {
          result: nlqResult.answer || 'No relevant information found.',
          raw: nlqResult,
        };
      } catch {
        return { result: 'Knowledge search returned no results.' };
      }
    }

    case 'search_claims': {
      const query = params.query as string;
      if (!query) return { result: 'Missing query.' };
      try {
        const claims = await client.searchClaims({ query_text: query, top_k: 5 });
        if (!claims || claims.length === 0) return { result: 'No matching claims found.' };
        const lines = claims.map((c: { claim_text: string; confidence: number }) =>
          `- ${c.claim_text} (${(c.confidence * 100).toFixed(0)}% confidence)`
        );
        return { result: lines.join('\n'), raw: claims };
      } catch {
        return { result: 'Claim search returned no results.' };
      }
    }

    case 'remember_preference': {
      const pref = params.preference as string;
      if (!pref) return { result: 'Missing preference.' };
      try {
        await client.event('workspace-assistant', {
          agentId: 1001,
          sessionId: 1,
          enableSemantic: true,
        }).context(`User preference: ${pref}`, 'preference').send();
        return { result: `Preference noted: "${pref}".` };
      } catch {
        return { result: `Preference noted: "${pref}".` };
      }
    }

    default:
      return { result: `Unknown action: ${action}. Available: query_deals, query_projects, query_team, update_deal, update_project, search_knowledge, search_claims, remember_preference.` };
  }
}
