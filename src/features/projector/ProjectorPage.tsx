import { useEffect } from 'react'

import { ProjectorLoading } from '@/features/projector/components/ProjectorLoading'
import { ProjectorLocked } from '@/features/projector/components/ProjectorLocked'
import { ProjectorShow } from '@/features/projector/components/ProjectorShow'
import { useAdminSession } from '@/hooks/useAdminSession'

import '@/features/projector/projector.css'

/** Live wall of the party, for admins and moderators. */
export function ProjectorPage() {
  const { currentUser, isVerifying } = useAdminSession()

  useEffect(() => {
    document.title = 'Telão Ao Vivo | Casamento de Thiago & Priscila'
  }, [])

  if (isVerifying) return <ProjectorLoading />
  if (!currentUser) return <ProjectorLocked />
  return <ProjectorShow />
}
