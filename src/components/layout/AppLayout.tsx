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
import { OfflineQueueService } from '@/services/offline-queue.service'

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

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-sage-50 flex flex-col md:flex-row text-sage-900">
      <Sidebar
        adminUser={currentUser}
        isCollapsed={isCollapsed}
        unreadCount={totalUnreadCount}
        onToggle={toggleSidebar}
        onSignOut={() => void handleSignOut()}
      />

      <div
        className={`flex-1 flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out ${
          isCollapsed ? 'md:pl-20' : 'md:pl-64 lg:pl-72'
        }`}
      >
        <MobileHeader
          adminUser={currentUser}
          onSignOut={() => void handleSignOut()}
        />
        {!isOnline && <OfflineBanner />}
        <main className="flex-1 w-full pb-24 md:pb-12">
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </div>
  )
}
