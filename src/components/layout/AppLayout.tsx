import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAdminSession } from '@/hooks/useAdminSession'
import { useFeedNotifications } from '@/hooks/useFeedNotifications'
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed'
import { useVisibleInterval } from '@/hooks/useVisibleInterval'
import { OfflineQueueService } from '@/services/offline-queue.service'

/** Retries the uploads that failed on a bad network. */
const UPLOAD_RETRY_MS = 30_000

/** Navigation around every screen, except the projector. */
export function AppLayout() {
  useInactivityTimeout()
  const isOnline = useNetworkStatus()
  const { totalUnreadCount } = useFeedNotifications()
  const { currentUser, signOut } = useAdminSession()
  const [isCollapsed, toggleSidebar] = useSidebarCollapsed()
  const navigate = useNavigate()
  usePageTitle(totalUnreadCount)

  useEffect(() => {
    if (isOnline) void OfflineQueueService.flush()
  }, [isOnline])

  useVisibleInterval(() => {
    if (isOnline) void OfflineQueueService.flush()
  }, UPLOAD_RETRY_MS)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-sage-50 flex flex-col lg:flex-row text-sage-900">
      <Sidebar
        adminUser={currentUser}
        isCollapsed={isCollapsed}
        unreadCount={totalUnreadCount}
        onToggle={toggleSidebar}
        onSignOut={() => void handleSignOut()}
      />

      <div
        className={`flex-1 min-w-0 flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}>
        <MobileHeader adminUser={currentUser} onSignOut={() => void handleSignOut()} />
        {!isOnline && <OfflineBanner />}
        <main className="flex-1 w-full has-[>[data-fill-height]]:flex flex-col pb-28 lg:pb-12 max-w-[90rem] mx-auto">
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </div>
  )
}
