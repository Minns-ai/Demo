import type { LiveUpdate } from '../../hooks/useWebSocket';

interface Props {
  updates: LiveUpdate[];
  onAskAbout?: (update: LiveUpdate) => void;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

const tableIcons: Record<string, string> = {
  deals: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  projects: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
};

const typeColors: Record<string, string> = {
  insert: 'text-emerald-400',
  update: 'text-amber-400',
  delete: 'text-rose-400',
};

export default function LiveFeed({ updates, onAskAbout }: Props) {
  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <svg className="w-8 h-8 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p className="text-xs">Watching for changes...</p>
        <p className="text-[10px] text-gray-600 mt-1">Deals and projects are live-tracked</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {updates.map((u) => (
        <button
          key={u.id}
          onClick={() => onAskAbout?.(u)}
          className="group w-full text-left p-2.5 bg-surface-2 rounded-lg hover:bg-surface-3 transition-colors animate-fade-in-up"
        >
          <div className="flex items-start gap-2">
            <svg className={`w-4 h-4 mt-0.5 shrink-0 ${typeColors[u.type] || 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tableIcons[u.table] || tableIcons.projects} />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-200 leading-snug">{u.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{u.table} &middot; {timeAgo(u.timestamp)}</p>
            </div>
          </div>
          <div className="mt-1 text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to ask about this
          </div>
        </button>
      ))}
    </div>
  );
}
