import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { formatRelativeTime } from '@/utils/relative-time'

// Without an offset, dates are in the local time zone, whose days count
beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-01-10T15:00:00') })
})
afterEach(() => {
  vi.useRealTimers()
})

it.each([
  ['2026-01-10T14:59:01', 'Agora mesmo'],
  ['2026-01-10T14:59:00', 'há 1 min'],
  ['2026-01-10T14:00:01', 'há 59 min'],
  ['2026-01-10T14:00:00', 'há 1 h'],
  ['2026-01-10T00:00:00', 'há 15 h'],
  ['2026-01-09T23:59:00', 'há 1 dia'],
  ['2026-01-09T00:00:00', 'há 1 dia'],
  ['2026-01-08T23:59:00', 'há 2 dias'],
  ['2026-01-05T00:00:00', 'há 5 dias'],
  ['2026-01-04T23:59:00', '04/01'],
])('formats %s as %s', (date, expected) => {
  expect(formatRelativeTime(date)).toBe(expected)
})

it('keeps hours for recent posts after midnight', () => {
  vi.setSystemTime(new Date('2026-01-10T01:00:00'))
  expect(formatRelativeTime('2026-01-09T23:00:00')).toBe('há 2 h')
})
