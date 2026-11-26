import { useCallback, useEffect, useState } from 'react'

import { useVisibleInterval } from '@/hooks/useVisibleInterval'
import { getChallengeRepository } from '@/services/repositories.factory'
import { getMomentExpiry, getMomentStart, isMomentLive, isMomentUpcoming } from '@/utils/moments'

import type { Challenge } from '@/types/domain'

/** Covers for realtime events lost while offline. */
const REFRESH_MS = 60_000
/** Timers may fire a little before their time. */
const TIMER_MARGIN_MS = 20

/** The moment of the party, as returned by {@link useMomentSchedule}. */
export interface MomentSchedule {
  /** Moment on air. */
  readonly live: Challenge | null
  /** Moment whose countdown is running. */
  readonly upcoming: Challenge | null
}

/**
 * Follows the admin live: the moment counting down or on air. Moves from one
 * to the other, and off the air, at the right time.
 */
export function useMomentSchedule(): MomentSchedule {
  const [moment, setMoment] = useState<Challenge | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const challengeRepository = getChallengeRepository()

  const refresh = useCallback(() => {
    challengeRepository
      .getLiveMoment()
      .then((scheduled) => {
        setNow(Date.now())
        setMoment(scheduled)
      })
      // Keep the current moment until the next try
      .catch(() => {})
  }, [challengeRepository])

  useEffect(() => {
    refresh()
    return challengeRepository.subscribeToChanges(refresh)
  }, [challengeRepository, refresh])
  useVisibleInterval(refresh, REFRESH_MS)

  const start = moment ? getMomentStart(moment) : null
  const expiry = moment ? getMomentExpiry(moment) : null
  const nextChange = start !== null && now < start ? start : expiry
  useEffect(() => {
    if (nextChange === null) return
    const timeoutId = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, nextChange - Date.now()) + TIMER_MARGIN_MS
    )
    return () => window.clearTimeout(timeoutId)
  }, [nextChange])

  return {
    live: moment && isMomentLive(moment, now) ? moment : null,
    upcoming: moment && isMomentUpcoming(moment, now) ? moment : null,
  }
}

/** Moment of the party on air, or `null`. See {@link useMomentSchedule}. */
export function useLiveMoment(): Challenge | null {
  return useMomentSchedule().live
}
