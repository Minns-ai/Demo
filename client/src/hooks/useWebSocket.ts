import { useState, useEffect, useRef, useCallback } from 'react';

export interface LiveUpdate {
  id: string;
  subscription_id: number;
  type: 'insert' | 'delete' | 'update';
  table: string;
  values: string[];
  old_values?: string[];
  timestamp: number;
  label: string;
}

interface WsMessage {
  type: string;
  subscription_id?: number;
  request_id?: string;
  initial?: { rows: { values: string[] }[] };
  inserts?: { values: string[] }[];
  deletes?: { values: string[] }[];
  message?: string;
}

const MINNS_WS = (import.meta as any).env?.VITE_MINNS_WS || 'ws://localhost:3000/api/subscriptions/ws';
const MAX_UPDATES = 30;

function describeChange(table: string, values: string[], type: 'insert' | 'delete' | 'update', old?: string[]): string {
  if (table === 'deals') {
    const name = values[0] || 'Unknown';
    const stage = values[1] || '';
    if (type === 'update' && old) {
      const oldStage = old[1] || '';
      if (oldStage !== stage) return `${name} moved to ${stage}`;
      return `${name} updated`;
    }
    if (type === 'insert') return `New deal: ${name} (${stage})`;
    return `Deal removed: ${name}`;
  }
  if (table === 'projects') {
    const name = values[0] || 'Unknown';
    const status = values[1] || '';
    if (type === 'update' && old) {
      const oldStatus = old[1] || '';
      if (oldStatus !== status) return `${name} → ${status}`;
      return `${name} updated`;
    }
    if (type === 'insert') return `New project: ${name}`;
    return `Project removed: ${name}`;
  }
  return `${table}: ${type}`;
}

export function useMinnsWebSocket() {
  const [connected, setConnected] = useState(false);
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const subsRef = useRef<Map<number, string>>(new Map()); // subscription_id → table name
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const idCounter = useRef(0);

  const addUpdate = useCallback((update: LiveUpdate) => {
    setUpdates(prev => [update, ...prev].slice(0, MAX_UPDATES));
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(MINNS_WS);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Subscribe to deals and projects tables
        for (const table of ['deals', 'projects']) {
          const reqId = `sub-${table}-${Date.now()}`;
          ws.send(JSON.stringify({
            type: 'subscribe',
            query: `SELECT * FROM ${table}`,
            request_id: reqId,
          }));
        }
      };

      ws.onmessage = (event) => {
        let msg: WsMessage;
        try { msg = JSON.parse(event.data); } catch { return; }

        if (msg.type === 'subscribed' && msg.subscription_id != null) {
          const table = msg.request_id?.replace('sub-', '').replace(/-\d+$/, '') || 'unknown';
          subsRef.current.set(msg.subscription_id, table);
        }

        if (msg.type === 'update' && msg.subscription_id != null) {
          const table = subsRef.current.get(msg.subscription_id) || 'unknown';

          // Detect updates: a delete followed by an insert with same name = update
          const inserts = msg.inserts || [];
          const deletes = msg.deletes || [];

          const deleteNames = new Set(deletes.map(d => d.values[0]));

          for (const ins of inserts) {
            const isUpdate = deleteNames.has(ins.values[0]);
            const old = isUpdate ? deletes.find(d => d.values[0] === ins.values[0]) : undefined;
            addUpdate({
              id: `${++idCounter.current}`,
              subscription_id: msg.subscription_id,
              type: isUpdate ? 'update' : 'insert',
              table,
              values: ins.values,
              old_values: old?.values,
              timestamp: Date.now(),
              label: describeChange(table, ins.values, isUpdate ? 'update' : 'insert', old?.values),
            });
          }

          for (const del of deletes) {
            if (!inserts.some(i => i.values[0] === del.values[0])) {
              addUpdate({
                id: `${++idCounter.current}`,
                subscription_id: msg.subscription_id,
                type: 'delete',
                table,
                values: del.values,
                timestamp: Date.now(),
                label: describeChange(table, del.values, 'delete'),
              });
            }
          }
        }
      };

      ws.onclose = () => {
        setConnected(false);
        subsRef.current.clear();
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, [addUpdate]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const clearUpdates = useCallback(() => setUpdates([]), []);

  return { connected, updates, clearUpdates };
}
