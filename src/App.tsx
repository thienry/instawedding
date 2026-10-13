import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { AdminPage } from '@/pages/AdminPage'
import { CapturePage } from '@/pages/CapturePage'
import { ChallengesPage } from '@/pages/ChallengesPage'
import { FeedPage } from '@/pages/FeedPage'
import { ProjectorPage } from '@/pages/ProjectorPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest Mobile Application Shell */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<FeedPage />} />
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* Projector Display (Full Screen, No Mobile App Frame) */}
        <Route path="/projector" element={<ProjectorPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
