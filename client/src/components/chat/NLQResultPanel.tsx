import { useState } from 'react';
import type { QueryResponse } from '../../api/client';

interface Props {
  queryResponse: QueryResponse | null;
  isLoading: boolean;
}

const queryTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  numeric: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  state: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  entity_summary: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  preference: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  relationship: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  nlq: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
};

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-2.5 py-2 text-left"
      >
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-[11px] font-semibold text-gray-600">{title}</span>
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 animate-fade-in-up">
          {children}
        </div>
      )}
    </div>
  );
}

export default function NLQResultPanel({ queryResponse, isLoading }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">NLQ Result</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!queryResponse && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
            <svg className="w-6 h-6 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-[11px] text-gray-400">Query results will appear here</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 border border-gray-100">
            <div className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-brand-400 animate-pulse" />
              <span className="w-1 h-1 rounded-full bg-brand-400 animate-pulse" style={{ animationDelay: '200ms' }} />
              <span className="w-1 h-1 rounded-full bg-brand-400 animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
            <span className="text-[10px] text-gray-400">Querying MINNS...</span>
          </div>
        )}

        {queryResponse && (
          <div className="space-y-2.5 animate-fade-in-up">
            {/* Query Type Badge */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <svg className="w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-[11px] font-semibold text-gray-600">Query Type</span>
              </div>
              {(() => {
                const tc = queryTypeColors[queryResponse.query_type] ?? queryTypeColors.nlq;
                return (
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold uppercase ${tc.bg} ${tc.text} ${tc.border}`}>
                    {queryResponse.query_type}
                  </span>
                );
              })()}
            </div>

            {/* Answer */}
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-semibold text-gray-600">Answer</span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">{queryResponse.answer}</p>
            </div>

            {/* Memory Context */}
            {queryResponse.memory_context != null && (
              <CollapsibleSection title="Memory Context">
                <pre className="text-[10px] text-gray-500 bg-white border border-gray-100 rounded p-2 overflow-auto max-h-40 font-mono whitespace-pre-wrap">
                  {JSON.stringify(queryResponse.memory_context, null, 2)}
                </pre>
              </CollapsibleSection>
            )}

            {/* Related Memories */}
            {queryResponse.related_memories.length > 0 && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-[11px] font-semibold text-gray-600">Related Memories</span>
                  <span className="ml-auto text-[10px] text-gray-400 font-mono">{queryResponse.related_memories.length}</span>
                </div>
                <div className="space-y-1">
                  {queryResponse.related_memories.map((m: any, i: number) => (
                    <div key={i} className="text-[11px] text-gray-500 truncate">
                      {m.summary ?? m.takeaway ?? JSON.stringify(m).slice(0, 60)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Strategies */}
            {queryResponse.related_strategies.length > 0 && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="text-[11px] font-semibold text-gray-600">Related Strategies</span>
                  <span className="ml-auto text-[10px] text-gray-400 font-mono">{queryResponse.related_strategies.length}</span>
                </div>
                <div className="space-y-1">
                  {queryResponse.related_strategies.map((s: any, i: number) => (
                    <div key={i} className="text-[11px] text-gray-500 truncate">
                      {s.name ?? s.summary ?? JSON.stringify(s).slice(0, 60)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
