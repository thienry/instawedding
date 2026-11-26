import { useCallback, useEffect, useState } from 'react'

import { useVisibleInterval } from '@/hooks/useVisibleInterval'
import { getChallengeRepository } from '@/services/repositories.factory'
import { getMomentExpiry, isMomentLive } from '@/utils/moments'

import type { Challenge } from '@/types/domain'

/** Covers for realtime events lost while offline. */
const REFRESH_MS = 60_000

/**
 * Moment of the party on air, or `null`. Follows the admin live and ends on
 * its own when the moment times out.
 */
export function useLiveMoment(): Challenge | null {
  const [moment, setMoment] = useState<Challenge | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const challengeRepository = getChallengeRepository()

  const refresh = useCallback(() => {
    challengeRepository
      .getLiveMoment()
      .then((live) => {
        setNow(Date.now())
        setMoment(live)
      })
      // Keep the current moment until the next try
      .catch(() => {})
  }, [challengeRepository])

  useEffect(() => {
    refresh()
    return challengeRepository.subscribeToChanges(refresh)
  }, [challengeRepository, refresh])
  useVisibleInterval(refresh, REFRESH_MS)

  const expiry = moment ? getMomentExpiry(moment) : null
  useEffect(() => {
    if (expiry === null) return
    const timeoutId = window.setTimeout(() => setNow(Date.now()), Math.max(0, expiry - Date.now()))
    return () => window.clearTimeout(timeoutId)
  }, [expiry])

  return moment && isMomentLive(moment, now) ? moment : null
}
