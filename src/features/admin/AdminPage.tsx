import { useMemo, useState } from 'react'

import { AdminLogin } from '@/features/admin/components/AdminLogin'
import { AdminTabs } from '@/features/admin/components/AdminTabs'
import { AdminTopBar } from '@/features/admin/components/AdminTopBar'
import { AlbumToolbar } from '@/features/admin/components/AlbumToolbar'
import { CeremonialistForm } from '@/features/admin/components/CeremonialistForm'
import { CeremonialistList } from '@/features/admin/components/CeremonialistList'
import { ChallengeForm } from '@/features/admin/components/ChallengeForm'
import { ChallengeList } from '@/features/admin/components/ChallengeList'
import { MetricsCards } from '@/features/admin/components/MetricsCards'
import { ModerationGrid } from '@/features/admin/components/ModerationGrid'
import { useAdminData } from '@/features/admin/hooks/useAdminData'
import { useAlbumExport } from '@/features/admin/hooks/useAlbumExport'
import { useCeremonialists } from '@/features/admin/hooks/useCeremonialists'
import { useChallenges } from '@/features/admin/hooks/useChallenges'
import { usePostModeration } from '@/features/admin/hooks/usePostModeration'
import { computeAdminStats } from '@/features/admin/utils/admin-stats'
import { useAdminSession } from '@/hooks/useAdminSession'
import { useDialog } from '@/hooks/useDialog'

import type { AdminTab } from '@/features/admin/types'

/**
 * Admin dashboard: moderation, album exports, challenges and ceremonialists.
 *
 * State lives here rather than in the tabs, so drafts and downloads survive
 * switching between them.
 */
export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('photos')
  const dialog = useDialog()
  const { currentUser, isAdmin, isVerifying, signOut } = useAdminSession()
  const data = useAdminData(currentUser)
  const moderation = usePostModeration(data, dialog)
  const albumExport = useAlbumExport(data.posts, dialog)
  const challengeAdmin = useChallenges(data, dialog)
  const ceremonialistAdmin = useCeremonialists(isAdmin, dialog)
  const stats = useMemo(() => computeAdminStats(data.posts), [data.posts])

  if (isVerifying) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
        <div className="w-8 h-8 border-2 border-sage-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-sage-800/70">Verificando credenciais...</p>
      </div>
    )
  }

  if (!currentUser) return <AdminLogin onClearSessions={signOut} />

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <AdminTopBar currentUser={currentUser} onSignOut={signOut} />
      <AdminTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        isAdmin={isAdmin}
        counts={{
          photos: data.posts.length,
          challenges: data.challenges.length,
          ceremonial: ceremonialistAdmin.ceremonialists.length,
        }}
      />

      {activeTab === 'photos' && (
        <>
          <MetricsCards stats={stats} />
          <AlbumToolbar
            moderation={moderation}
            albumExport={albumExport}
            stats={stats}
            isAdmin={isAdmin}
          />
          <ModerationGrid
            moderation={moderation}
            isLoading={data.isLoading}
            isAdmin={isAdmin}
          />
        </>
      )}

      {activeTab === 'challenges' && (
        <div className="space-y-6">
          <ChallengeForm challengeAdmin={challengeAdmin} />
          <ChallengeList
            challenges={data.challenges}
            challengeAdmin={challengeAdmin}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {activeTab === 'ceremonial' && isAdmin && (
        <div className="space-y-6">
          <CeremonialistForm ceremonialistAdmin={ceremonialistAdmin} />
          <CeremonialistList ceremonialistAdmin={ceremonialistAdmin} />
        </div>
      )}

      {dialog.dialog}
    </div>
  )
}
