import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { formatRelativeTime } from '@/utils/relative-time'

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-01-10T12:00:00Z') })
})
afterEach(() => {
  vi.useRealTimers()
})

it.each([
  ['2026-01-10T11:59:01Z', 'Agora mesmo'],
  ['2026-01-10T11:59:00Z', 'há 1 min'],
  ['2026-01-10T11:00:01Z', 'há 59 min'],
  ['2026-01-10T11:00:00Z', 'há 1 h'],
  ['2026-01-09T12:00:01Z', 'há 23 h'],
  ['2026-01-05T12:00:00Z', '05/01'],
])('formats %s as %s', (date, expected) => {
  expect(formatRelativeTime(date)).toBe(expected)
})
