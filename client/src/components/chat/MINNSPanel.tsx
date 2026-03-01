import { useState, useEffect } from 'react';
import type { AgentStep, MemoryItem, StrategyItem, ClaimItem, TelemetryEntry } from '../../api/client';
import { getTelemetry } from '../../api/client';

interface Props {
  steps: AgentStep[];
  isThinking: boolean;
}

const eventCategoryMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
  recall: { label: 'Context', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  think: { label: 'Cognitive', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  act: { label: 'Action', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  observe: { label: 'Learning', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  reflect: { label: 'Cognitive', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  answer: { label: 'Communication', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  context: { label: 'Semantic', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  suggest: { label: 'Policy', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
};

function getDebugFromSteps(steps: AgentStep[]) {
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].type === 'answer' && steps[i].debug) {
      return steps[i].debug!;
    }
  }
  return null;
}

function getSuggestionsFromSteps(steps: AgentStep[]) {
  for (const step of steps) {
    if (step.type === 'suggest' && step.suggestions) {
      return step.suggestions as { action: string; confidence: number; reason: string }[];
    }
  }
  return [];
}

export default function MINNSPanel({ steps, isThinking }: Props) {
  const debug = getDebugFromSteps(steps);
  const suggestions = getSuggestionsFromSteps(steps);
  const toEvents = steps.filter(s => s.type !== 'answer');

  return (
    <div className="flex flex-col h-full">
      {/* To MINNS - top half */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-gray-100">
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">To MINNS</h3>
          {toEvents.length > 0 && (
            <span className="ml-auto text-[10px] text-gray-400 font-mono">{toEvents.length} events</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {toEvents.length === 0 && !isThinking && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
              <svg className="w-6 h-6 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              <p className="text-[11px] text-gray-400">Events sent to MINNS will appear here</p>
            </div>
          )}

          {toEvents.map((step, i) => {
            const cat = eventCategoryMap[step.type] ?? eventCategoryMap.think;
            return (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cat.bg} ${cat.color} ${cat.border}`}>
                  {cat.label}
                </span>
                <span className="text-[11px] text-gray-500 truncate flex-1">
                  {step.type === 'recall' && `Recall (goal: ${step.goal ?? 'general'})`}
                  {step.type === 'think' && (step.thought ? String(step.thought).slice(0, 50) + (String(step.thought).length > 50 ? '...' : '') : 'Reasoning')}
                  {step.type === 'act' && (step.action ?? 'Tool execution')}
                  {step.type === 'observe' && 'Observation processed'}
                  {step.type === 'reflect' && (step.decision === 'finish' ? 'Decision: finish' : 'Decision: continue')}
                  {step.type === 'context' && `[${step.contextType}] ${step.text ?? ''}`}
                  {step.type === 'suggest' && `${(step.suggestions as any[])?.length ?? 0} action suggestions`}
                </span>
              </div>
            );
          })}

          {isThinking && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-brand-400 animate-pulse" />
                <span className="w-1 h-1 rounded-full bg-brand-400 animate-pulse" style={{ animationDelay: '200ms' }} />
                <span className="w-1 h-1 rounded-full bg-brand-400 animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
              <span className="text-[10px] text-gray-400">Streaming...</span>
            </div>
          )}
        </div>
      </div>

      {/* From MINNS - bottom half */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
          </svg>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">From MINNS</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!debug && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
              <svg className="w-6 h-6 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
              <p className="text-[11px] text-gray-400">Data received from MINNS will appear here</p>
            </div>
          )}

          {debug && (
            <div className="space-y-2.5 animate-fade-in-up">
              {/* Memories Recalled */}
              <DataSection
                icon="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                title="Memories Recalled"
                count={debug.memoriesRecalled.length}
                color="text-violet-500"
              >
                {debug.memoriesRecalled.map((m: MemoryItem, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px]">
                    <span className={`px-1 py-0.5 rounded text-[9px] font-semibold uppercase border ${
                      m.tier === 'Episodic' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      m.tier === 'Semantic' ? 'bg-violet-50 text-violet-600 border-violet-200' :
                      'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>{m.tier}</span>
                    <span className="text-gray-500 truncate">{m.summary.slice(0, 40)}{m.summary.length > 40 ? '...' : ''}</span>
                  </div>
                ))}
              </DataSection>

              {/* Strategies Consulted */}
              <DataSection
                icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                title="Strategies"
                count={debug.strategiesConsulted.length}
                color="text-emerald-500"
              >
                {debug.strategiesConsulted.map((s: StrategyItem, i: number) => (
                  <div key={i} className="text-[11px] text-gray-500 truncate">{s.name}</div>
                ))}
              </DataSection>

              {/* Claims Found */}
              <DataSection
                icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                title="Claims Found"
                count={debug.claimsFound.length}
                color="text-amber-500"
              >
                {debug.claimsFound.slice(0, 3).map((c: ClaimItem, i: number) => (
                  <div key={i} className="text-[11px] text-gray-500 truncate">{c.claim_text ?? c.text ?? 'Claim'}</div>
                ))}
                {debug.claimsFound.length > 3 && (
                  <div className="text-[10px] text-gray-400">+{debug.claimsFound.length - 3} more</div>
                )}
              </DataSection>

              {/* Action Suggestions */}
              {suggestions.length > 0 && (
                <DataSection
                  icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  title="Action Suggestions"
                  count={suggestions.length}
                  color="text-cyan-500"
                >
                  {suggestions.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-mono text-cyan-600 font-medium">{s.action}</span>
                      <span className="text-gray-400">{Math.round(s.confidence * 100)}%</span>
                    </div>
                  ))}
                </DataSection>
              )}

              {/* Events Emitted */}
              {debug.eventsEmitted.length > 0 && (
                <DataSection
                  icon="M13 10V3L4 14h7v7l9-11h-7z"
                  title="Events Emitted"
                  count={debug.eventsEmitted.length}
                  color="text-cyan-500"
                >
                  <div className="flex flex-wrap gap-1">
                    {debug.eventsEmitted.map((e: string, i: number) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-600 border border-cyan-200 font-mono">{e}</span>
                    ))}
                  </div>
                </DataSection>
              )}

              {/* Goal Detection */}
              {debug.goalDesc && (
                <DataSection
                  icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  title="Goal Detected"
                  count={null}
                  color="text-brand-500"
                >
                  <div className="text-[11px] text-gray-600 italic">{debug.goalDesc}</div>
                </DataSection>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DataSection({ icon, title, count, color, children }: {
  icon: string;
  title: string;
  count: number | null;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <svg className={`w-3.5 h-3.5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
        <span className="text-[11px] font-semibold text-gray-600">{title}</span>
        {count !== null && (
          <span className="ml-auto text-[10px] text-gray-400 font-mono">{count}</span>
        )}
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}
