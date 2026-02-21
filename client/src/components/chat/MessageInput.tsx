import { useState, KeyboardEvent } from 'react';

const suggestions = [
  'Where is my order ORD-1001?',
  'I want to return order ORD-1002',
  'Tell me about the Ergonomic Keyboard',
  'I have a complaint about late delivery',
  'Show me my account info',
  'What products do you recommend?',
];

export default function MessageInput({ onSend, disabled }: { onSend: (msg: string) => void; disabled: boolean }) {
  const [value, setValue] = useState('');

  function submit() {
    const msg = value.trim();
    if (!msg || disabled) return;
    onSend(msg);
    setValue('');
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-surface-4 p-4 bg-surface-1">
      <div className="flex gap-2 mb-3 flex-wrap">
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => { setValue(s); }}
            className="text-[11px] px-2.5 py-1 rounded-full bg-surface-3 text-gray-400 hover:text-gray-200 hover:bg-surface-4 transition-colors truncate max-w-[200px]"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message..."
          className="input-field flex-1"
          disabled={disabled}
        />
        <button onClick={submit} disabled={disabled || !value.trim()} className="btn-primary">
          Send
        </button>
      </div>
    </div>
  );
}
