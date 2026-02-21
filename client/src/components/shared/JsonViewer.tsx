import { useState } from 'react';

export default function JsonViewer({ data, label }: { data: unknown; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button onClick={() => setOpen(!open)} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {label || 'Debug JSON'}
      </button>
      {open && (
        <pre className="mt-1 p-2 bg-surface-1 rounded text-[11px] text-gray-400 overflow-auto max-h-48">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
