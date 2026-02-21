import IntentBadge from './IntentBadge';
import JsonViewer from '../shared/JsonViewer';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  text: string;
  intent?: string;
  confidence?: number;
  slots?: Record<string, string>;
  timestamp: number;
}

export default function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] ${isUser ? 'order-2' : ''}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-brand-600 text-white rounded-br-md'
            : 'bg-surface-2 text-gray-200 rounded-bl-md border border-surface-4'
        }`}>
          {msg.text.split('\n').map((line, i) => (
            <p key={i} className={i > 0 ? 'mt-1' : ''}>
              {line.split(/(\*\*.*?\*\*)/g).map((part, j) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
                  : part
              )}
            </p>
          ))}
        </div>
        {!isUser && msg.intent && (
          <div className="mt-1.5 flex items-center gap-2">
            <IntentBadge intent={msg.intent} confidence={msg.confidence} />
            {msg.slots && Object.keys(msg.slots).length > 0 && (
              <JsonViewer data={msg.slots} label="Slots" />
            )}
          </div>
        )}
        <div className={`text-[10px] text-gray-600 mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(msg.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
