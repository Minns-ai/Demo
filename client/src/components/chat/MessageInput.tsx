import { useState, KeyboardEvent } from 'react';

export default function MessageInput({ onSend, disabled }: { onSend: (msg: string) => void; disabled: boolean }) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

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
    <div className="border-t border-gray-100 p-4 bg-white">
      <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border transition-all duration-200 ${focused ? 'border-brand-300 bg-brand-50/30 shadow-sm' : 'border-gray-200 bg-gray-50'}`}>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-0 px-1 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none text-sm"
          disabled={disabled}
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
