import { useEffect, useRef } from 'react';
import type { AgentStep } from '../../api/client';

interface Props {
  steps: AgentStep[];
  isThinking: boolean;
}

const stepConfig: Record<string, { icon: string; label: string; color: string; bg: string; borderColor: string }> = {
  recall: { icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', label: 'Recalling', color: 'text-violet-600', bg: 'bg-violet-50', borderColor: 'border-violet-300' },
  think: { icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.591.659H9.061a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V5a2 2 0 00-2-2H7a2 2 0 00-2 2v9.5', label: 'Thinking', color: 'text-blue-600', bg: 'bg-blue-50', borderColor: 'border-blue-300' },
  act: { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Acting', color: 'text-emerald-600', bg: 'bg-emerald-50', borderColor: 'border-emerald-300' },
  observe: { icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', label: 'Observing', color: 'text-amber-600', bg: 'bg-amber-50', borderColor: 'border-amber-300' },
  reflect: { icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', label: 'Reflecting', color: 'text-purple-600', bg: 'bg-purple-50', borderColor: 'border-purple-300' },
  answer: { icon: 'M5 13l4 4L19 7', label: 'Answer Ready', color: 'text-emerald-600', bg: 'bg-emerald-50', borderColor: 'border-emerald-300' },
  context: { icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z', label: 'Context Sent', color: 'text-rose-600', bg: 'bg-rose-50', borderColor: 'border-rose-300' },
  suggest: { icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', label: 'SDK Suggests', color: 'text-cyan-600', bg: 'bg-cyan-50', borderColor: 'border-cyan-300' },
};

export default function ThinkingStream({ steps, isThinking }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [steps]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isThinking ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent Thinking</h3>
        {isThinking && (
          <div className="ml-auto flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {steps.length === 0 && !isThinking && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
            <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-[11px] text-gray-400">Agent reasoning will appear here</p>
          </div>
        )}

        {steps.filter(s => s.type !== 'answer').map((step, i) => {
          const cfg = stepConfig[step.type] ?? stepConfig.think;
          return (
            <div
              key={i}
              className={`border-l-2 ${cfg.borderColor} pl-3 py-1.5 animate-fade-in-up`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <svg className={`w-3.5 h-3.5 ${cfg.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                </svg>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>

              {step.type === 'recall' && (
                <div className="flex gap-2.5 text-[10px]">
                  {step.goal && <span className="text-indigo-600 font-semibold">{step.goal}</span>}
                  <span className="text-violet-500">{step.memories} mem</span>
                  <span className="text-emerald-500">{step.strategies} strat</span>
                  <span className="text-amber-500">{step.claims} claims</span>
                </div>
              )}

              {step.type === 'think' && (
                <div>
                  <p className="text-[11px] text-gray-600 italic leading-relaxed">{step.thought}</p>
                  {step.action && (
                    <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-[10px]">
                      <span className="text-blue-600 font-mono">{step.action}</span>
                      {step.action_input && Object.keys(step.action_input).length > 0 && (
                        <span className="text-gray-400 font-mono">{JSON.stringify(step.action_input)}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step.type === 'act' && (
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded text-[10px] mb-0.5">
                    <span className="text-emerald-600 font-mono font-medium">{step.action}</span>
                  </div>
                  {step.result != null && (
                    <pre className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded p-1.5 mt-1 overflow-auto max-h-20 font-mono">
                      {typeof step.result === 'string' ? step.result : JSON.stringify(step.result, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {step.type === 'observe' && (
                <p className="text-[11px] text-gray-600 leading-relaxed bg-amber-50/50 border border-amber-100 rounded p-1.5">
                  {step.observation && step.observation.length > 150
                    ? step.observation.slice(0, 150) + '...'
                    : step.observation}
                </p>
              )}

              {step.type === 'reflect' && (
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-gray-600 italic">{String(step.thought ?? '')}</p>
                    {step.decision === 'finish' && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded font-medium">done</span>
                    )}
                    {step.decision === 'continue' && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded font-medium">cont</span>
                    )}
                  </div>
                  {step.goalShift && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{String((step.goalShift as any).from)}</span>
                      <span className="text-gray-400">&rarr;</span>
                      <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded font-semibold">{String((step.goalShift as any).to)}</span>
                    </div>
                  )}
                </div>
              )}

              {step.type === 'context' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded font-semibold uppercase">{step.contextType}</span>
                  <p className="text-[11px] text-gray-500 truncate">{step.text}</p>
                </div>
              )}

              {step.type === 'suggest' && step.suggestions && (
                <div className="space-y-1">
                  {(step.suggestions as { action: string; confidence: number; reason: string }[]).map((s, j) => (
                    <div key={j} className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-cyan-600 font-mono font-medium">{s.action}</span>
                      <span className="text-gray-400">{Math.round(s.confidence * 100)}%</span>
                      {s.reason && <span className="text-gray-400 truncate">{s.reason}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isThinking && (
          <div className="border-l-2 border-blue-200 pl-3 py-1.5">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '200ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
              <span className="text-[10px] text-gray-400">Processing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
