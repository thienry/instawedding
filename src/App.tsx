import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { FeedPage } from './pages/FeedPage';
import { CapturePage } from './pages/CapturePage';
import { ChallengesPage } from './pages/ChallengesPage';
import { ProjectorPage } from './pages/ProjectorPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest Mobile Application Shell */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<FeedPage />} />
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
        </Route>

        {/* Projector Display (Full Screen, No Mobile App Frame) */}
        <Route path="/projector" element={<ProjectorPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
