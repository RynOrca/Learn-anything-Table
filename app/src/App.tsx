import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Chat from './pages/Chat';
import Practice from './pages/Practice';
import Roadmap from './pages/Roadmap';
import Settings from './pages/Settings';
import { useSettingsStore } from './store/useSettingsStore';

export default function App() {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  useEffect(() => { loadSettings(); }, []); // eslint-disable-line

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/history" element={<History />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
