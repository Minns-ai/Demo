import { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      {/* Dark icon rail */}
      <Sidebar />
      {/* Content area with padding so white panels float on the dark bg */}
      <main className="flex-1 overflow-hidden p-3 pl-2">
        {children}
      </main>
    </div>
  );
}
