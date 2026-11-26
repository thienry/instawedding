import type { Challenge } from '@/types/domain'

/** A moment the ceremonial forgot to end leaves the air on its own. */
export const MOMENT_MAX_MS = 30 * 60_000

/** Countdowns the ceremonial can start before a moment, in minutes. */
export const MOMENT_COUNTDOWN_MINUTES = [2, 5, 10] as const

/**
 * When the moment goes on air, or `null` when it is not scheduled. A start in
 * the future means a countdown is running.
 */
export function getMomentStart(moment: Challenge): number | null {
  if (!moment.isMoment || !moment.liveSince) return null
  const start = Date.parse(moment.liveSince)
  return Number.isNaN(start) ? null : start
}

/** When the moment leaves the air on its own, or `null` when it is not scheduled. */
export function getMomentExpiry(moment: Challenge): number | null {
  const start = getMomentStart(moment)
  return start === null ? null : start + MOMENT_MAX_MS
}

/** Whether the moment is on air at `now`. */
export function isMomentLive(moment: Challenge, now: number): boolean {
  const start = getMomentStart(moment)
  return start !== null && start <= now && now < start + MOMENT_MAX_MS
}

/** Whether a countdown to the moment is running at `now`. */
export function isMomentUpcoming(moment: Challenge, now: number): boolean {
  const start = getMomentStart(moment)
  return start !== null && now < start
}

/** Whole minutes the moment has been on air, never negative. */
export function getMinutesOnAir(moment: Challenge, now: number): number {
  const start = getMomentStart(moment)
  return start === null ? 0 : Math.max(0, Math.floor((now - start) / 60_000))
}

/** Whole seconds left until `target`, rounded up and never negative. */
export function getSecondsLeft(target: number, now: number): number {
  return Math.max(0, Math.ceil((target - now) / 1000))
}

/** Seconds as `m:ss`, such as `4:05`. */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}
