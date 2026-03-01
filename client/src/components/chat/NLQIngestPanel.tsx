import type { IngestResponse } from '../../api/client';

interface Props {
  ingestResult: IngestResponse | null;
  messageCount: number;
  isLoading: boolean;
}

const statConfig: { key: keyof IngestResponse; label: string; color: string; icon: string }[] = [
  { key: 'messages_processed', label: 'Messages Processed', color: 'text-blue-600', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
  { key: 'transactions_found', label: 'Transactions Found', color: 'text-emerald-600', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { key: 'state_changes_found', label: 'State Changes', color: 'text-amber-600', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { key: 'relationships_found', label: 'Relationships', color: 'text-violet-600', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101' },
  { key: 'chitchat_skipped', label: 'Chitchat Skipped', color: 'text-gray-500', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636' },
];

export default function NLQIngestPanel({ ingestResult, messageCount, isLoading }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">NLQ Ingest</h3>
        {isLoading && (
          <div className="ml-auto flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {!ingestResult && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
            <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <p className="text-[11px] text-gray-400">Ingestion stats will appear here</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-2 animate-fade-in-up">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '200ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
                <span className="text-[11px] text-blue-600 font-medium">Ingesting conversation...</span>
              </div>
              <p className="text-[10px] text-blue-500 mt-1">{messageCount} message{messageCount !== 1 ? 's' : ''} in session</p>
            </div>
          </div>
        )}

        {ingestResult && (
          <div className="space-y-1.5 animate-fade-in-up">
            {statConfig.map(({ key, label, color, icon }) => (
              <div key={key} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 border border-gray-100">
                <svg className={`w-3.5 h-3.5 ${color} flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
                <span className="text-[11px] text-gray-600 flex-1">{label}</span>
                <span className={`text-[12px] font-semibold font-mono ${color}`}>{ingestResult[key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
