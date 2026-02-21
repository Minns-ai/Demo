import { useState, useRef, useEffect } from 'react';
import MessageBubble, { Message } from '../components/chat/MessageBubble';
import MessageInput from '../components/chat/MessageInput';
import BrainPanel from '../components/chat/BrainPanel';
import ContextPanel from '../components/chat/ContextPanel';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { sendMessage, ChatResponse } from '../api/client';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDebug, setLastDebug] = useState<ChatResponse['debug'] | null>(null);
  const [lastHandler, setLastHandler] = useState<ChatResponse['handlerResult']>(null);
  const [lastIntent, setLastIntent] = useState<ChatResponse['intent'] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text: string) {
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await sendMessage(text);
      const agentMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'agent',
        text: res.reply,
        intent: res.intent.intent,
        confidence: res.intent.confidence,
        slots: res.intent.slots,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, agentMsg]);
      setLastDebug(res.debug);
      setLastHandler(res.handlerResult);
      setLastIntent(res.intent);
    } catch (err: any) {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'agent',
        text: `Error: ${err.message}. Make sure the server is running on port 3001.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full">
      <BrainPanel
        memories={lastDebug?.memoriesRecalled ?? []}
        strategies={lastDebug?.strategiesConsulted ?? []}
        claims={lastDebug?.claimsFound ?? []}
        actionSuggestions={lastDebug?.actionSuggestions ?? []}
        eventsEmitted={lastDebug?.eventsEmitted ?? []}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-3 border-b border-surface-4 bg-surface-1">
          <h1 className="text-sm font-semibold text-gray-200">Customer Service Chat</h1>
          <p className="text-[11px] text-gray-500">Powered by minns-sdk | Intent Sidecar + Fluent Events + Three-Tier Memory</p>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-600/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-300 mb-1">TechGear Customer Service</h2>
              <p className="text-sm text-gray-500 max-w-md">
                Try asking about orders, returns, products, or account info.
                Watch the Brain panel update with each message.
              </p>
            </div>
          )}
          {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
          {loading && <LoadingSpinner size="sm" />}
        </div>
        <MessageInput onSend={handleSend} disabled={loading} />
      </div>
      <ContextPanel
        goalDesc={lastDebug?.goalDesc ?? null}
        goalProgress={lastDebug?.goalProgress ?? 0}
        handlerResult={lastHandler}
        claimsHint={lastIntent?.claims_hint}
      />
    </div>
  );
}
