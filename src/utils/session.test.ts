// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'

import {
  getGuestName,
  getGuestSession,
  getOrCreateSessionId,
  setGuestName,
  setTermsAccepted,
} from '@/utils/session'

beforeEach(() => localStorage.clear())

it('keeps the same session id', () => {
  expect(getOrCreateSessionId()).toBe(getOrCreateSessionId())
})

it('trims the guest name and clears it when blank', () => {
  setGuestName('  Ana ')
  expect(getGuestName()).toBe('Ana')
  setGuestName('   ')
  expect(getGuestName()).toBe('')
})

it('records and revokes the terms consent', () => {
  setTermsAccepted()
  expect(getGuestSession().termsAcceptedAt).not.toBeNull()
  setTermsAccepted(false)
  expect(getGuestSession().termsAcceptedAt).toBeNull()
})
