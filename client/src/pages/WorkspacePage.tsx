import { useState, useRef, useEffect, useCallback } from 'react';
import MessageInput from '../components/chat/MessageInput';
import MessageBubble from '../components/chat/MessageBubble';
import ThinkingStream from '../components/chat/ThinkingStream';
import KnowledgePanel from '../components/chat/KnowledgePanel';
import { useMinnsWebSocket, type LiveUpdate } from '../hooks/useWebSocket';
import { sendMessageSSE, queryNLQ, type AgentStep, type MemoryItem, type ClaimItem } from '../api/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
  tableData?: { columns: string[]; rows: string[][] };
}

const STARTER_PROMPTS = [
  { text: 'Show me the deal pipeline', icon: '📊' },
  { text: 'What changed this week?', icon: '🔄' },
  { text: 'How is the Q3 launch going?', icon: '🚀' },
  { text: 'Summarize the team workload', icon: '👥' },
];

export default function WorkspacePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [showPanel, setShowPanel] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { connected: wsConnected, updates } = useMinnsWebSocket();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, steps]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setSteps([]);
    setMemories([]);
    setClaims([]);

    try {
      await sendMessageSSE(
        text.trim(),
        {
          onStep: (step: AgentStep) => {
            setSteps(prev => {
              const next = [...prev, step];

              // Extract reply from answer step
              if (step.type === 'answer' && step.reply) {
                const reply = step.reply;
                let tableData: ChatMessage['tableData'];
                const tableMatch = reply.match(/\|(.+)\|\n\|[\s-|]+\|\n((?:\|.+\|\n?)+)/);
                if (tableMatch) {
                  const headerLine = tableMatch[1];
                  const bodyLines = tableMatch[2].trim().split('\n');
                  const columns = headerLine.split('|').map(c => c.trim()).filter(Boolean);
                  const rows = bodyLines.map(line =>
                    line.split('|').map(c => c.trim()).filter(Boolean)
                  );
                  tableData = { columns, rows };
                }

                const agentMsg: ChatMessage = {
                  id: `a-${Date.now()}`,
                  role: 'agent',
                  text: reply,
                  timestamp: Date.now(),
                  tableData,
                };
                setMessages(m => [...m, agentMsg]);
              }

              if (step.type === 'recall' && step.debug) {
                setMemories(step.debug.memoriesRecalled || []);
                setClaims(step.debug.claimsFound || []);
              }

              return next;
            });
          },
          onDone: () => {
            setLoading(false);
            setSteps([]);
          },
          onError: (err: string) => {
            const errMsg: ChatMessage = {
              id: `e-${Date.now()}`,
              role: 'agent',
              text: `Something went wrong: ${err}`,
              timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errMsg]);
            setLoading(false);
            setSteps([]);
          },
        },
        'workspace-user',
      );
    } catch (err) {
      setLoading(false);
      setSteps([]);
    }
  }, [loading]);

  const handleAskAbout = useCallback((update: LiveUpdate) => {
    handleSend(`Tell me about this update: ${update.label}`);
  }, [handleSend]);

  return (
    <div className="h-full flex">
      {/* ── Center: Chat ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-brand-500/30 mb-6">
                M
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Workspace Assistant</h1>
              <p className="text-sm text-gray-400 mb-8 max-w-md text-center">
                I know your team, your deals, and your projects. I remember our past conversations and learn your preferences over time.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-lg">
                {STARTER_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p.text)}
                    className="flex items-center gap-3 px-4 py-3 bg-surface-2 rounded-xl text-left text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-all group"
                  >
                    <span className="text-lg">{p.icon}</span>
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`mb-4 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
              {msg.role === 'user' ? (
                <div className="max-w-xl bg-brand-500/20 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm">
                  {msg.text}
                </div>
              ) : (
                <div className="max-w-2xl">
                  {msg.tableData ? (
                    <div className="bg-surface-2 rounded-xl p-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            {msg.tableData.columns.map((col, i) => (
                              <th key={i} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider pb-2 pr-4">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {msg.tableData.rows.map((row, ri) => (
                            <tr key={ri} className="border-t border-surface-4">
                              {row.map((cell, ci) => (
                                <td key={ci} className="py-2 pr-4 text-gray-300">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && steps.length > 0 && (
            <div className="mb-4">
              <ThinkingStream steps={steps} isThinking={loading} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-surface-4 px-6 py-3 bg-surface-0">
          <MessageInput onSend={handleSend} disabled={loading} />
        </div>
      </div>

      {/* ── Right: Knowledge Panel ───────────────────── */}
      {showPanel && (
        <div className="w-72 shrink-0">
          <KnowledgePanel
            memories={memories}
            claims={claims}
            updates={updates}
            wsConnected={wsConnected}
            onAskAbout={handleAskAbout}
          />
        </div>
      )}

      {/* Panel toggle */}
      <button
        onClick={() => setShowPanel(p => !p)}
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all z-10"
        title={showPanel ? 'Hide panel' : 'Show panel'}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={showPanel
            ? 'M13 5l7 7-7 7M5 5l7 7-7 7'
            : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'
          } />
        </svg>
      </button>
    </div>
  );
}
