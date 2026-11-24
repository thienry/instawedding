import { useEffect, useState } from 'react'

import { getChallengeRepository } from '@/services/repositories.factory'

import type { Challenge } from '@/types/domain'

/** Details of the post being written, as returned by {@link usePostDraft}. */
export interface PostDraft {
  readonly caption: string
  readonly setCaption: (caption: string) => void
  readonly challenges: readonly Challenge[]
  readonly challengeId: number | null
  readonly setChallengeId: (id: number | null) => void
  readonly showOnProjector: boolean
  readonly setShowOnProjector: (show: boolean) => void
}

/** Holds the caption, challenge and projector choice of the post. */
export function usePostDraft(initialChallengeId: number | null): PostDraft {
  const [caption, setCaption] = useState('')
  const [challenges, setChallenges] = useState<readonly Challenge[]>([])
  const [challengeId, setChallengeId] = useState(initialChallengeId)
  const [showOnProjector, setShowOnProjector] = useState(true)
  const challengeRepo = getChallengeRepository()

  useEffect(() => {
    challengeRepo
      .getChallenges()
      .then(setChallenges)
      // Challenges are optional: the guest can still post without them
      .catch(() => {})
  }, [challengeRepo])

  return {
    caption,
    setCaption,
    challenges,
    challengeId,
    setChallengeId,
    showOnProjector,
    setShowOnProjector,
  }
}
