import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ChatPage from './pages/ChatPage';
import ClaimsPage from './pages/ClaimsPage';
import ArchitecturePage from './pages/ArchitecturePage';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/claims" element={<ClaimsPage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
      </Routes>
    </AppShell>
  );
}
