import { useState, useEffect } from 'react';
import WorkspacePage from './pages/WorkspacePage';
import ComparisonPage from './pages/ComparisonPage';
import SetupModal from './components/shared/SetupModal';
import { getHealth, getConfigStatus } from './api/client';

type Page = 'workspace' | 'compare';

export default function App() {
  const [showSetup, setShowSetup] = useState<boolean | null>(null);
  const [page, setPage] = useState<Page>('workspace');

  useEffect(() => {
    (async () => {
      try {
        const health = await getHealth();
        if (health.is_healthy) { setShowSetup(false); return; }
      } catch { /* server starting */ }

      try {
        const cfg = await getConfigStatus();
        if (cfg.minns_configured && cfg.has_llm) { setShowSetup(false); return; }
      } catch {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const cfg = await getConfigStatus();
          if (cfg.minns_configured && cfg.has_llm) { setShowSetup(false); return; }
        } catch { /* still down */ }
      }
      setShowSetup(true);
    })();
  }, []);

  const navItems: { id: Page; icon: string; label: string }[] = [
    { id: 'workspace', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', label: 'Workspace' },
    { id: 'compare', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3', label: 'Compare' },
  ];

  return (
    <div className="h-screen bg-surface-0 overflow-hidden">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 bottom-0 w-16 flex flex-col items-center bg-surface-0 border-r border-surface-4 z-40">
        <div className="py-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-brand-500/30">
            M
          </div>
        </div>

        <nav className="flex-1 py-3 flex flex-col items-center gap-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all group ${
                page === item.id ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {page === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-400 rounded-r-full" />
              )}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-surface-3 rounded-lg text-[11px] text-white font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                {item.label}
              </div>
            </button>
          ))}
        </nav>

        <div className="py-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px 2px rgba(52,211,153,0.4)' }} title="Connected" />
        </div>
      </aside>

      {/* Main content */}
      <div style={{ marginLeft: 64 }} className="h-screen overflow-hidden relative">
        {page === 'workspace' ? <WorkspacePage /> : <ComparisonPage />}
      </div>

      {showSetup === true && <SetupModal onHealthy={() => setShowSetup(false)} />}
    </div>
  );
}
