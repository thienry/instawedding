import type { Challenge } from '@/types/domain'

/** A moment the ceremonial forgot to end leaves the air on its own. */
export const MOMENT_MAX_MS = 30 * 60_000

/** When the moment leaves the air on its own, or `null` when it is not on air. */
export function getMomentExpiry(moment: Challenge): number | null {
  if (!moment.isMoment || !moment.liveSince) return null
  const since = Date.parse(moment.liveSince)
  return Number.isNaN(since) ? null : since + MOMENT_MAX_MS
}

/** Whether the moment is on air at `now`. */
export function isMomentLive(moment: Challenge, now: number): boolean {
  const expiry = getMomentExpiry(moment)
  return expiry !== null && now < expiry
}

/** Whole minutes the moment has been on air, never negative. */
export function getMinutesOnAir(moment: Challenge, now: number): number {
  const since = moment.liveSince ? Date.parse(moment.liveSince) : NaN
  return Number.isNaN(since) ? 0 : Math.max(0, Math.floor((now - since) / 60_000))
}
