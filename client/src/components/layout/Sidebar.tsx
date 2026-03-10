import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';

const nav = [
  { to: '/chat', label: 'Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { to: '/claims', label: 'Claims', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { to: '/architecture', label: 'How It Works', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
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
    <aside style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 64, zIndex: 40 }} className="flex flex-col items-center bg-surface-0">
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
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-400 rounded-r-full" />
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
