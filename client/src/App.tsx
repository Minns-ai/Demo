// Demo shell. The product is the comparison — there are no tabs and no
// other surfaces. The sidebar exists only as a brand frame (logo, the
// dotted-graph motif from the marketing site, a small live/offline
// indicator). The page itself is rendered into the remaining width.

import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import ComparisonPage from './pages/ComparisonPage';
import SetupModal from './components/shared/SetupModal';
import { getHealth, getConfigStatus } from './api/client';

export default function App() {
  const [showSetup, setShowSetup] = useState<boolean | null>(null);

  useEffect(() => {
    // First-run check: if the server is healthy and the keys are wired,
    // skip the setup modal entirely; otherwise show it. Done once on mount.
    (async () => {
      try {
        const health = await getHealth();
        if (health.is_healthy) { setShowSetup(false); return; }
      } catch { /* server still starting */ }

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
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <Sidebar wsConnected={true} />
      <main className="ml-56 h-screen overflow-hidden">
        <ComparisonPage />
      </main>
      {showSetup === true && <SetupModal onHealthy={() => setShowSetup(false)} />}
    </div>
  );
}
