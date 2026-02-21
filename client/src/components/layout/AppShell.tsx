import { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-surface-0">
        {children}
      </main>
    </div>
  );
}
