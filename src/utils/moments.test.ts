import { describe, expect, it } from 'vitest'

import {
  formatCountdown,
  getMinutesOnAir,
  getSecondsLeft,
  isMomentLive,
  isMomentUpcoming,
  MOMENT_MAX_MS,
} from '@/utils/moments'

import type { Challenge } from '@/types/domain'

const SINCE = '2026-12-12T22:00:00.000Z'
const START = Date.parse(SINCE)

const moment = (changes: Partial<Challenge> = {}): Challenge => ({
  id: 6,
  title: 'Primeira Dança',
  description: 'Mande sua foto!',
  icon: '💃',
  isActive: true,
  createdAt: SINCE,
  isMoment: true,
  liveSince: SINCE,
  ...changes,
})

describe('isMomentLive', () => {
  it('lasts until it is ended or times out', () => {
    expect(isMomentLive(moment(), START + 60_000)).toBe(true)
    expect(isMomentLive(moment(), START + MOMENT_MAX_MS)).toBe(false)
    expect(isMomentLive(moment({ liveSince: null }), START)).toBe(false)
  })

  it('ignores challenges and broken dates', () => {
    expect(isMomentLive(moment({ isMoment: false }), START)).toBe(false)
    expect(isMomentLive(moment({ liveSince: 'x' }), START)).toBe(false)
  })
})

it('counts whole minutes on air', () => {
  expect(getMinutesOnAir(moment(), START + 3.5 * 60_000)).toBe(3)
  expect(getMinutesOnAir(moment(), START - 5000)).toBe(0)
})

it('counts down to a moment scheduled for later', () => {
  expect(isMomentUpcoming(moment(), START - 1)).toBe(true)
  expect(isMomentLive(moment(), START - 1)).toBe(false)
  expect(isMomentUpcoming(moment(), START)).toBe(false)
  expect(isMomentLive(moment(), START)).toBe(true)
  expect(isMomentUpcoming(moment({ liveSince: null }), START - 1)).toBe(false)
})

it('formats the seconds left', () => {
  expect(getSecondsLeft(START, START - 4500)).toBe(5)
  expect(getSecondsLeft(START, START + 1)).toBe(0)
  expect(formatCountdown(245)).toBe('4:05')
  expect(formatCountdown(9)).toBe('0:09')
})
