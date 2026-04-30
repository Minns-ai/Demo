import { useState, useEffect } from 'react';
import WorkspacePage from './pages/WorkspacePage';
import SetupModal from './components/shared/SetupModal';
import { getHealth, getConfigStatus } from './api/client';

export default function App() {
  const [showSetup, setShowSetup] = useState<boolean | null>(null);

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

  return (
    <div className="h-screen bg-surface-0 overflow-hidden">
      {/* Sidebar strip */}
      <aside className="fixed top-0 left-0 bottom-0 w-16 flex flex-col items-center bg-surface-0 border-r border-surface-4 z-40">
        <div className="py-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-brand-500/30">
            M
          </div>
        </div>
        <div className="flex-1" />
        <div className="py-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px 2px rgba(52,211,153,0.4)' }} title="Connected" />
        </div>
      </aside>

      {/* Main content */}
      <div style={{ marginLeft: 64 }} className="h-screen overflow-hidden relative">
        <WorkspacePage />
      </div>

      {showSetup === true && <SetupModal onHealthy={() => setShowSetup(false)} />}
    </div>
  );
}
