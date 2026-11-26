import { useEffect, useState } from 'react'

import { useBannedTermList } from '@/hooks/useBannedTermList'
import { useLiveMoment } from '@/hooks/useLiveMoment'
import { getChallengeRepository } from '@/services/repositories.factory'
import { findBannedTermInText } from '@/utils/banned-terms'

import type { Challenge } from '@/types/domain'

/** Details of the post being written, as returned by {@link usePostDraft}. */
export interface PostDraft {
  readonly caption: string
  readonly setCaption: (caption: string) => void
  /** Banned term in the caption, which keeps the post from being sent. */
  readonly bannedTerm: string | null
  /** Active challenges, plus the moment on air. */
  readonly challenges: readonly Challenge[]
  readonly challengeId: number | null
  readonly setChallengeId: (id: number | null) => void
  /** Moment that went on air while the guest was here, even if it has ended. */
  readonly moment: Challenge | null
  readonly showOnProjector: boolean
  readonly setShowOnProjector: (show: boolean) => void
}

/**
 * Holds the caption, challenge and projector choice of the post. Until the
 * guest chooses, the post goes to the challenge in the link or, without one,
 * to the moment on air.
 */
export function usePostDraft(initialChallengeId: number | null): PostDraft {
  const [caption, setCaption] = useState('')
  const [activeChallenges, setActiveChallenges] = useState<readonly Challenge[]>([])
  // `undefined` until the guest chooses
  const [chosenId, setChosenId] = useState<number | null>()
  const [showOnProjector, setShowOnProjector] = useState(true)
  const liveMoment = useLiveMoment()
  const bannedTerms = useBannedTermList()
  // A photo of the moment may be posted just after it ends
  const [moment, setMoment] = useState<Challenge | null>(null)
  const challengeRepo = getChallengeRepository()

  if (liveMoment && liveMoment !== moment) setMoment(liveMoment)

  useEffect(() => {
    challengeRepo
      .getChallenges()
      .then(setActiveChallenges)
      // Challenges are optional: the guest can still post without them
      .catch(() => {})
  }, [challengeRepo])

  const challenges =
    moment && !activeChallenges.some(({ id }) => id === moment.id)
      ? [moment, ...activeChallenges]
      : activeChallenges

  return {
    caption,
    setCaption,
    bannedTerm: findBannedTermInText(caption, bannedTerms),
    challenges,
    challengeId: chosenId !== undefined ? chosenId : (initialChallengeId ?? moment?.id ?? null),
    setChallengeId: setChosenId,
    moment,
    showOnProjector,
    setShowOnProjector,
  }
}
