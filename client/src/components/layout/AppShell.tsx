import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import SetupModal from '../shared/SetupModal';
import GuidedTour from '../shared/GuidedTour';
import SDKReferencePanel from '../shared/SDKReferencePanel';
import { getHealth, getConfigStatus } from '../../api/client';

// ── Tour Context ────────────────────────────────────────────────────
interface TourContextType {
  startTour: () => void;
}

const TourContext = createContext<TourContextType>({ startTour: () => {} });
export function useTour() { return useContext(TourContext); }

// ── AppShell ────────────────────────────────────────────────────────
export default function AppShell({ children }: { children: ReactNode }) {
  // null = still checking, true = needs setup, false = healthy
  const [showSetup, setShowSetup] = useState<boolean | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [sdkRefOpen, setSdkRefOpen] = useState(false);

  // Check health + config on mount
  // Only show setup if keys are actually missing — not just because server is slow to connect
  useEffect(() => {
    (async () => {
      try {
        const health = await getHealth();
        if (health.is_healthy) {
          setShowSetup(false);
          return;
        }
      } catch {
        // Server might not be reachable yet
      }

      // Health failed — check if keys are configured
      try {
        const cfg = await getConfigStatus();
        // If keys are set, don't block with the modal — server will come up
        if (cfg.minns_configured && cfg.has_llm) {
          setShowSetup(false);
          return;
        }
      } catch {
        // Server not reachable at all — could be starting up
        // Wait a moment and retry once before showing setup
        await new Promise(r => setTimeout(r, 2000));
        try {
          const cfg = await getConfigStatus();
          if (cfg.minns_configured && cfg.has_llm) {
            setShowSetup(false);
            return;
          }
        } catch {
          // Still can't reach server
        }
      }

      // Keys are missing or server is completely down — show setup
      setShowSetup(true);
    })();
  }, []);

  const handleHealthy = useCallback(() => {
    setShowSetup(false);
  }, []);

  const startTour = useCallback(() => {
    setShowTour(true);
  }, []);

  return (
    <TourContext.Provider value={{ startTour }}>
      {/* Fixed sidebar — always visible, never affected by content layout */}
      <Sidebar onOpenSDKRef={() => setSdkRefOpen(true)} />

      {/* Content area — offset by sidebar width */}
      <div style={{ marginLeft: 64 }} className="h-screen overflow-hidden bg-gray-100">
        <main className="h-full overflow-hidden p-2">
          {children}
        </main>
      </div>

      {/* SDK Reference Panel */}
      <SDKReferencePanel open={sdkRefOpen} onClose={() => setSdkRefOpen(false)} />

      {/* Setup Modal — blocks until healthy */}
      {showSetup === true && <SetupModal onHealthy={handleHealthy} />}

      {/* Guided Tour */}
      {showTour && <GuidedTour onClose={() => setShowTour(false)} />}
    </TourContext.Provider>
  );
}
