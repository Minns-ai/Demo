import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import SetupModal from '../shared/SetupModal';
import GuidedTour from '../shared/GuidedTour';
import SDKReferencePanel from '../shared/SDKReferencePanel';
import { getHealth } from '../../api/client';

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

  // Check health on mount
  useEffect(() => {
    getHealth()
      .then(h => setShowSetup(!h.is_healthy))
      .catch(() => setShowSetup(true));
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
