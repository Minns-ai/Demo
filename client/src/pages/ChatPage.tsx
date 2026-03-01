import { useState, useRef, useEffect } from 'react';
import MessageBubble, { Message } from '../components/chat/MessageBubble';
import MessageInput from '../components/chat/MessageInput';
import ThinkingStream from '../components/chat/ThinkingStream';
import MINNSPanel from '../components/chat/MINNSPanel';
import NLQIngestPanel from '../components/chat/NLQIngestPanel';
import NLQResultPanel from '../components/chat/NLQResultPanel';
import { sendMessageSSE, AgentStep, ingestConversations, queryConversations } from '../api/client';
import type { IngestResponse, QueryResponse, ConversationMessage } from '../api/client';

type Mode = 'events' | 'nlq';

const customers = [
  { id: 'CUST-100', name: 'Alice Chen', tier: 'premium' },
  { id: 'CUST-101', name: 'Bob Martinez', tier: 'standard' },
  { id: 'CUST-102', name: 'Carol Wang', tier: 'vip' },
];

const tierColors: Record<string, string> = {
  standard: 'bg-gray-100 text-gray-600 border-gray-200',
  premium: 'bg-violet-50 text-violet-600 border-violet-200',
  vip: 'bg-amber-50 text-amber-600 border-amber-200',
};

const starterPrompts = [
  {
    text: 'Where is my order ORD-1001?',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    text: 'I want to return order ORD-1002',
    icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
  },
  {
    text: 'What monitors do you recommend?',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    text: 'I have a complaint about late delivery',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  },
];

export default function ChatPage() {
  const [mode, setMode] = useState<Mode>('events');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [customerId, setCustomerId] = useState('CUST-100');
  const scrollRef = useRef<HTMLDivElement>(null);

  // NLQ-specific state
  const [nlqLoading, setNlqLoading] = useState(false);
  const [lastIngestResult, setLastIngestResult] = useState<IngestResponse | null>(null);
  const [lastQueryResponse, setLastQueryResponse] = useState<QueryResponse | null>(null);

  const customer = customers.find(c => c.id === customerId) ?? customers[0];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function switchMode(newMode: Mode) {
    if (newMode === mode) return;
    setMode(newMode);
    setMessages([]);
    setSteps([]);
    setLoading(false);
    setNlqLoading(false);
    setLastIngestResult(null);
    setLastQueryResponse(null);
  }

  async function handleSendEvents(text: string) {
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setSteps([]);

    try {
      await sendMessageSSE(text, {
        onStep(step: AgentStep) {
          setSteps(prev => [...prev, step]);

          if (step.type === 'answer' && step.reply) {
            const agentMsg: Message = {
              id: `a-${Date.now()}`,
              role: 'agent',
              text: step.reply,
              intent: step.intent?.intent,
              confidence: step.intent?.confidence,
              slots: step.intent?.slots,
              memoriesUsed: step.debug?.memoriesRecalled ?? [],
              claimsUsed: step.debug?.claimsFound ?? [],
              timestamp: Date.now(),
            };
            setMessages(prev => [...prev, agentMsg]);
          }
        },
        onDone() {
          setLoading(false);
        },
        onError(error: string) {
          const errMsg: Message = {
            id: `e-${Date.now()}`,
            role: 'agent',
            text: `Error: ${error}. Make sure the server is running on port 3001.`,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, errMsg]);
          setLoading(false);
        },
      }, customerId);
    } catch (err: any) {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'agent',
        text: `Error: ${err.message}. Make sure the server is running on port 3001.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
      setLoading(false);
    }
  }

  async function handleSendNLQ(text: string) {
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setNlqLoading(true);
    setLastQueryResponse(null);

    try {
      // Build conversation from all messages so far (including the new one)
      const allMessages = [...messages, userMsg];
      const convMessages: ConversationMessage[] = allMessages.map(m => ({
        role: m.role === 'agent' ? 'assistant' as const : 'user' as const,
        content: m.text,
      }));

      const sessionId = `nlq-${customerId}-${Date.now()}`;

      // Step 1: Ingest the conversation
      const ingestResult = await ingestConversations({
        case_id: customerId,
        sessions: [{
          session_id: sessionId,
          topic: 'customer-service',
          messages: convMessages,
        }],
      });
      setLastIngestResult(ingestResult);

      // Step 2: Query MINNS
      const queryResult = await queryConversations(text, sessionId);
      setLastQueryResponse(queryResult);

      // Display answer as agent message
      const agentMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'agent',
        text: queryResult.answer,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'agent',
        text: `Error: ${err.message}. Make sure the server is running on port 3001.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setNlqLoading(false);
    }
  }

  function handleSend(text: string) {
    if (mode === 'events') {
      handleSendEvents(text);
    } else {
      handleSendNLQ(text);
    }
  }

  const isLoading = loading || nlqLoading;
  const showWelcome = messages.length === 0 && !isLoading;
  const subtitle = mode === 'events'
    ? 'minns-sdk  |  ReAct + Memory + Claims'
    : 'minns-sdk  |  Conversational NLQ';

  return (
    <div className="flex h-full gap-3">
      {/* Left Panel */}
      <div className="w-72 flex-shrink-0 bg-white rounded-2xl shadow-sm overflow-hidden">
        {mode === 'events' ? (
          <ThinkingStream steps={steps} isThinking={loading} />
        ) : (
          <NLQIngestPanel
            ingestResult={lastIngestResult}
            messageCount={messages.length}
            isLoading={nlqLoading}
          />
        )}
      </div>

      {/* Chat Area (center) */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              M
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-800">Customer Service Agent</h1>
            <p className="text-[11px] text-gray-400">{subtitle}</p>
          </div>

          {/* Mode Toggle */}
          <div className="ml-4 flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => switchMode('events')}
              disabled={isLoading}
              className={`text-[11px] font-semibold px-3 py-1 rounded-md transition-all duration-200 ${
                mode === 'events'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Events
            </button>
            <button
              onClick={() => switchMode('nlq')}
              disabled={isLoading}
              className={`text-[11px] font-semibold px-3 py-1 rounded-md transition-all duration-200 ${
                mode === 'nlq'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              NLQ
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Customer</span>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setMessages([]);
                setSteps([]);
                setLastIngestResult(null);
                setLastQueryResponse(null);
              }}
              disabled={isLoading}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.tier.toUpperCase()})</option>
              ))}
            </select>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase ${tierColors[customer.tier]}`}>
              {customer.tier}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          {showWelcome && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
              <div className="relative mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/15">
                  <span className="text-xl font-bold text-white">M</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                Customer Service Agent
              </h2>
              <p className="text-sm text-gray-400 max-w-sm mb-8">
                {mode === 'events'
                  ? 'Ask a question to see the agent reason step-by-step.'
                  : 'Ask a question to see conversational NLQ ingestion + query.'}
              </p>

              {/* Starter Prompts */}
              <div className="w-full max-w-sm">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2.5 font-medium">Try asking</p>
                <div className="grid grid-cols-2 gap-2">
                  {starterPrompts.map(prompt => (
                    <button
                      key={prompt.text}
                      onClick={() => handleSend(prompt.text)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-200 rounded-xl text-left transition-all duration-200 group"
                    >
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-500 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={prompt.icon} />
                      </svg>
                      <span className="text-[11px] text-gray-500 group-hover:text-gray-700 leading-tight">{prompt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map(m => <MessageBubble key={m.id} msg={m} />)}

          {isLoading && messages.length > 0 && (
            <div className="flex justify-start mb-3">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {mode === 'events' ? 'Thinking...' : 'Querying...'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <MessageInput onSend={handleSend} disabled={isLoading} />
      </div>

      {/* Right Panel */}
      <div className="w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm overflow-hidden">
        {mode === 'events' ? (
          <MINNSPanel steps={steps} isThinking={loading} />
        ) : (
          <NLQResultPanel queryResponse={lastQueryResponse} isLoading={nlqLoading} />
        )}
      </div>
    </div>
  );
}
