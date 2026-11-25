import { Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { FeedPage } from '@/features/feed/FeedPage'
import { lazyPage } from '@/utils/lazy-page'

const { Page: CapturePage, preload: preloadCapture } = lazyPage(() =>
  import('@/features/capture/CapturePage').then((m) => m.CapturePage)
)
const { Page: ChallengesPage, preload: preloadChallenges } = lazyPage(() =>
  import('@/features/challenges/ChallengesPage').then((m) => m.ChallengesPage)
)
const { Page: AdminPage } = lazyPage(() =>
  import('@/features/admin/AdminPage').then((m) => m.AdminPage)
)
const { Page: ProjectorPage } = lazyPage(() =>
  import('@/features/projector/ProjectorPage').then((m) => m.ProjectorPage)
)

/** Leaves the network to the feed first. */
const PRELOAD_DELAY_MS = 3000

function RouteLoadingFallback() {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3 text-gold-400 py-12">
      <div className="w-8 h-8 rounded-full border-2 border-gold-400/25 border-t-gold-400 animate-spin" />
      <span className="text-xs text-sage-600 font-medium">Carregando...</span>
    </div>
  )
}

export function App() {
  // Guests must be able to post after losing the signal
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      preloadCapture()
      preloadChallenges()
    }, PRELOAD_DELAY_MS)
    return () => window.clearTimeout(timeoutId)
  }, [])

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
