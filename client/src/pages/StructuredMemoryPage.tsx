import { useState } from 'react';
import {
  listStructuredMemory, getStructuredMemory, deleteStructuredMemory, useApiData,
  getTemplateType, getTemplateData,
} from '../api/client';
import type { StructuredMemoryListResponse, StructuredMemoryGetResponse } from '../api/client';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import Badge from '../components/shared/Badge';
import LearnMoreBanner from '../components/shared/LearnMoreBanner';
import LedgerView from '../components/structured-memory/LedgerView';
import StateMachineView from '../components/structured-memory/StateMachineView';
import PreferenceListView from '../components/structured-memory/PreferenceListView';
import TreeView from '../components/structured-memory/TreeView';

const prefixOptions = [
  { value: '', label: 'All' },
  { value: 'order:', label: 'Orders' },
  { value: 'return:', label: 'Returns' },
  { value: 'refunds:', label: 'Refunds' },
  { value: 'prefs:', label: 'Preferences' },
  { value: 'escalation:', label: 'Escalations' },
];

export default function StructuredMemoryPage() {
  const [prefix, setPrefix] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<StructuredMemoryGetResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const { data: listData, loading, refetch } = useApiData<StructuredMemoryListResponse>(
    () => listStructuredMemory(prefix || undefined),
    [prefix]
  );

  const keys = listData?.keys ?? [];

  const handleSelect = async (key: string) => {
    setSelectedKey(key);
    setDetailLoading(true);
    try {
      const item = await getStructuredMemory(key);
      setDetail(item);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (key: string) => {
    await deleteStructuredMemory(key);
    setSelectedKey(null);
    setDetail(null);
    refetch();
  };

  const templateBadge = (type: string): 'brand' | 'green' | 'amber' | 'red' | 'gray' => {
    const map: Record<string, 'brand' | 'green' | 'amber' | 'red'> = {
      Ledger: 'green',
      StateMachine: 'brand',
      PreferenceList: 'amber',
      Tree: 'red',
    };
    return map[type] ?? 'gray';
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <LearnMoreBanner
        title="Typed Data Templates: Ledger, StateMachine, PreferenceList, Tree"
        description="Structured memory provides typed, schema-enforced data containers for tracking balances, state transitions, preferences, and hierarchies."
        sdkMethods={[
          { method: 'upsertStructuredMemory()', endpoint: 'POST /structured-memory', description: 'Create or overwrite a structured memory key with a typed template' },
          { method: 'transitionState()', endpoint: 'POST /structured-memory/:key/state', description: 'Transition a StateMachine to a new state with a trigger' },
          { method: 'appendLedgerEntry()', endpoint: 'POST /structured-memory/:key/ledger', description: 'Append a Credit/Debit entry to a Ledger and return the new balance' },
          { method: 'updatePreference()', endpoint: 'POST /structured-memory/:key/preference', description: 'Update an item rank and score in a PreferenceList' },
        ]}
        responseFields={[
          { field: 'template', type: 'StructuredMemoryTemplate', description: 'Discriminated union: Ledger | StateMachine | PreferenceList | Tree' },
          { field: 'balance', type: 'number', description: 'Current ledger balance (Ledger only)' },
          { field: 'current_state', type: 'string', description: 'Current state machine state (StateMachine only)' },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-200">Structured Memory</h1>
        <p className="text-sm text-gray-500">Browse and manage structured memory keys — ledgers, state machines, preferences, and trees</p>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Panel — Key Browser */}
        <div className="w-72 shrink-0 flex flex-col">
          {/* Prefix Filter */}
          <div className="flex flex-wrap gap-1 mb-3">
            {prefixOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPrefix(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  prefix === opt.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-3 text-gray-400 hover:text-gray-200 hover:bg-surface-4'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Key List */}
          <div className="flex-1 overflow-y-auto card !p-0">
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : keys.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                No structured memory keys found.
                {prefix && ' Try a different filter.'}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {keys.map(key => (
                  <button
                    key={key}
                    onClick={() => handleSelect(key)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors ${
                      selectedKey === key ? 'bg-white/10' : ''
                    }`}
                  >
                    <div className="text-xs text-gray-300 truncate">{key}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 text-xs text-gray-400 text-center">
            {listData ? `${keys.length} keys` : ''}
          </div>
        </div>

        {/* Right Panel — Detail View */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {!selectedKey ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 text-sm">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                Select a key to view details
              </div>
            </div>
          ) : detailLoading ? (
            <LoadingSpinner size="lg" />
          ) : detail ? (
            <DetailView detail={detail} templateBadge={templateBadge} onDelete={handleDelete} />
          ) : (
            <div className="card text-center py-8 text-sm text-gray-500">
              Failed to load details for this key
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailView({
  detail,
  templateBadge,
  onDelete,
}: {
  detail: StructuredMemoryGetResponse;
  templateBadge: (type: string) => 'brand' | 'green' | 'amber' | 'red' | 'gray';
  onDelete: (key: string) => void;
}) {
  const templateType = getTemplateType(detail.template);
  const templateData = getTemplateData(detail.template);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-200">{detail.key}</div>
          <div className="mt-1">
            <Badge variant={templateBadge(templateType)}>{templateType}</Badge>
          </div>
        </div>
        <button
          onClick={() => onDelete(detail.key)}
          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Template-specific rendering */}
      {templateType === 'Ledger' && (
        <LedgerView memKey={detail.key} data={templateData as any} />
      )}
      {templateType === 'StateMachine' && (
        <StateMachineView memKey={detail.key} data={templateData as any} />
      )}
      {templateType === 'PreferenceList' && (
        <PreferenceListView data={templateData as any} />
      )}
      {templateType === 'Tree' && (
        <TreeView data={templateData as any} />
      )}
      {!['Ledger', 'StateMachine', 'PreferenceList', 'Tree'].includes(templateType) && (
        <div className="card">
          <pre className="text-xs text-gray-400 overflow-auto max-h-96">
            {JSON.stringify(templateData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
