import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';

const nav = [
  { to: '/chat', label: 'Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { to: '/dashboard', label: 'Dashboard', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { to: '/memories', label: 'Memories', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { to: '/strategies', label: 'Strategies', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to: '/graph', label: 'Graph', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
  { to: '/claims', label: 'Claims', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { to: '/conversations', label: 'Conversations', icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-1m0 0V6a2 2 0 012-2h8a2 2 0 012 2v5a2 2 0 01-2 2h-2l-4 4v-4H9z' },
  { to: '/nlq', label: 'NLQ', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/structured-memory', label: 'Structured Memory', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
  { to: '/architecture', label: 'Architecture', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
];

interface SidebarProps {
  onOpenSDKRef?: () => void;
}

export default function Sidebar({ onOpenSDKRef }: SidebarProps) {
  const [healthy, setHealthy] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.ok ? r.json() : null)
      .then(d => setHealthy(d?.is_healthy ?? false))
      .catch(() => setHealthy(false));

    const interval = setInterval(() => {
      fetch('/api/health')
        .then(r => r.ok ? r.json() : null)
        .then(d => setHealthy(d?.is_healthy ?? false))
        .catch(() => setHealthy(false));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-16 flex flex-col h-full items-center bg-surface-0 flex-shrink-0">
      {/* Logo */}
      <div className="py-5 w-full flex justify-center">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-brand-500/30">
          M
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 flex flex-col items-center gap-1">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-400 rounded-r-full" />
                )}
                <svg className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {/* Tooltip */}
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-surface-3 rounded-lg text-[11px] text-white font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
                  {item.label}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="py-4 w-full flex flex-col items-center gap-3">
        {onOpenSDKRef && (
          <button
            onClick={onOpenSDKRef}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all group relative"
            title="SDK Reference"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-surface-3 rounded-lg text-[11px] text-white font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
              SDK Reference
            </div>
          </button>
        )}
        <div className={`w-2 h-2 rounded-full ${healthy ? 'bg-emerald-400' : 'bg-gray-600'}`}
             style={healthy ? { boxShadow: '0 0 6px 2px rgba(52, 211, 153, 0.4)' } : {}}
             title={healthy ? 'MINNS SDK Connected' : 'Disconnected'} />
      </div>
    </aside>
  );
}
