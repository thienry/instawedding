import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { OfflineQueueService } from '@/services/offline-queue.service'
import { getGuestSession, setTermsAccepted } from '@/utils/session'

import type { MediaSelection } from '@/features/capture/hooks/useMediaSelection'
import type { PostDraft } from '@/features/capture/hooks/usePostDraft'
import type { GuestUser } from '@/types/domain'

/** Post submission, as returned by {@link usePostSubmit}. */
interface PostSubmit {
  readonly isSubmitting: boolean
  readonly submit: (guestUser: GuestUser) => Promise<void>
  /** Queues a guestbook card, which has no other details. */
  readonly submitCard: (guestUser: GuestUser, file: File, showOnProjector: boolean) => Promise<void>
}

/**
 * Queues the post for background upload and returns to the feed.
 *
 * @param onError - Receives the message to show when the post is not queued.
 */
export function usePostSubmit(
  media: MediaSelection,
  draft: PostDraft,
  onError: (message: string) => void
): PostSubmit {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (guestUser: GuestUser) => {
    setIsSubmitting(true)
    try {
      const file = await media.prepareFile()
      if (!file) {
        onError('Nenhuma mídia selecionada.')
        setIsSubmitting(false)
        return
      }

      setTermsAccepted(true)
      await OfflineQueueService.submitInBackground({
        file,
        authorName: guestUser.name,
        authorAvatarUrl: guestUser.avatarUrl,
        caption: draft.caption.trim() || null,
        challengeId: draft.challengeId,
        challenge: draft.challenges.find(({ id }) => id === draft.challengeId),
        clientSessionId: guestUser.id || getGuestSession().sessionId,
        showOnProjector: draft.showOnProjector,
      })

      media.releasePreview()
      navigate('/')
    } catch (err) {
      onError(
        err instanceof Error ? err.message : 'Falha ao preparar a publicação. Tente novamente.'
      )
      setIsSubmitting(false)
    }
  }

  const submitCard = async (guestUser: GuestUser, file: File, showOnProjector: boolean) => {
    setTermsAccepted(true)
    await OfflineQueueService.submitInBackground({
      file,
      authorName: guestUser.name,
      authorAvatarUrl: guestUser.avatarUrl,
      caption: '💌 Recado para os noivos',
      challengeId: null,
      clientSessionId: guestUser.id,
      showOnProjector,
    })
    navigate('/')
  }

  return { isSubmitting, submit, submitCard }
}
