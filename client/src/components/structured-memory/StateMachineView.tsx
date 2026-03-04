import { useState } from 'react';
import { transitionState, getCurrentState, useApiData } from '../../api/client';
import type { StateCurrentResponse } from '../../api/client';
import Badge from '../shared/Badge';

interface StateMachineData {
  current_state: string;
  history: { from: string; to: string; trigger: string }[];
  provenance: string;
}

export default function StateMachineView({ memKey, data }: { memKey: string; data: StateMachineData }) {
  const { data: stateInfo, refetch } = useApiData<StateCurrentResponse>(() => getCurrentState(memKey), [memKey]);
  const [newState, setNewState] = useState('');
  const [trigger, setTrigger] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentState = stateInfo?.current_state ?? data.current_state ?? 'unknown';
  const history = data.history ?? [];

  const handleTransition = async () => {
    if (!newState || !trigger) return;
    setSubmitting(true);
    try {
      await transitionState(memKey, { new_state: newState, trigger });
      setNewState('');
      setTrigger('');
      refetch();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current State */}
      <div className="card flex items-center gap-4">
        <div>
          <div className="text-[11px] text-gray-500 uppercase tracking-wider">Current State</div>
          <div className="mt-1">
            <Badge variant="brand">{currentState}</Badge>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[11px] text-gray-500">{data.provenance}</div>
        </div>
      </div>

      {/* History Timeline */}
      {history.length > 0 && (
        <div className="card">
          <div className="text-xs font-medium text-gray-400 mb-3">Transition History</div>
          <div className="space-y-2">
            {history.slice().reverse().map((h, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                <Badge variant="gray">{h.from}</Badge>
                <span className="text-gray-600">&rarr;</span>
                <Badge variant="brand">{h.to}</Badge>
                <span className="text-gray-500 ml-auto">{h.trigger}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transition Form */}
      <div className="card space-y-3">
        <div className="text-xs font-medium text-gray-400">Manual Transition</div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New state"
            value={newState}
            onChange={e => setNewState(e.target.value)}
            className="flex-1 bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500"
          />
          <input
            type="text"
            placeholder="Trigger"
            value={trigger}
            onChange={e => setTrigger(e.target.value)}
            className="flex-1 bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={handleTransition}
            disabled={submitting || !newState || !trigger}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
          >
            {submitting ? '...' : 'Transition'}
          </button>
        </div>
      </div>
    </div>
  );
}
