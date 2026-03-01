import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import MemoriesPage from './pages/MemoriesPage';
import StrategiesPage from './pages/StrategiesPage';
import GraphPage from './pages/GraphPage';
import ClaimsPage from './pages/ClaimsPage';
import ConversationsPage from './pages/ConversationsPage';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/memories" element={<MemoriesPage />} />
        <Route path="/strategies" element={<StrategiesPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/claims" element={<ClaimsPage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
      </Routes>
    </AppShell>
  );
}
