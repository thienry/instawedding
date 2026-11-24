import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { FeedPage } from '@/features/feed/FeedPage'

// Lazy-loaded routes for 4G performance & chunk isolation
const CapturePage = lazy(() =>
  import('@/pages/CapturePage').then((m) => ({ default: m.CapturePage }))
)
const ChallengesPage = lazy(() =>
  import('@/pages/ChallengesPage').then((m) => ({ default: m.ChallengesPage }))
)
const AdminPage = lazy(() =>
  import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage }))
)
const ProjectorPage = lazy(() =>
  import('@/pages/ProjectorPage').then((m) => ({ default: m.ProjectorPage }))
)

function RouteLoadingFallback() {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3 text-gold-400 py-12">
      <div className="w-8 h-8 rounded-full border-2 border-gold-400/25 border-t-gold-400 animate-spin" />
      <span className="text-xs text-sage-600 font-medium">Carregando...</span>
    </div>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
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
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
