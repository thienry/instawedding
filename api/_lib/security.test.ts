import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createAdminToken,
  createOtpChallengeToken,
  getAdminTokenFromRequest,
  timingSafeCompare,
  verifyAdminToken,
  verifyOtpChallenge,
} from './security.js'

const EMAIL = 'guest@example.com'

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-01-01T12:00:00Z') })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('admin token', () => {
  it('round-trips role and identity', () => {
    const token = createAdminToken('moderator', EMAIL, 'Ana')
    expect(verifyAdminToken(token)).toMatchObject({
      role: 'moderator',
      email: EMAIL,
      name: 'Ana',
    })
  })

  it('expires', () => {
    const token = createAdminToken('admin', EMAIL, 'Ana', 60)
    vi.advanceTimersByTime(59_000)
    expect(verifyAdminToken(token)).not.toBeNull()
    vi.advanceTimersByTime(1_000)
    expect(verifyAdminToken(token)).toBeNull()
  })

  it('rejects a payload changed to escalate the role', () => {
    const [payload, signature] = createAdminToken('moderator').split('.')
    const data = JSON.parse(Buffer.from(payload!, 'base64url').toString())
    const forged = Buffer.from(
      JSON.stringify({ ...data, role: 'admin' })
    ).toString('base64url')
    expect(verifyAdminToken(`${forged}.${signature}`)).toBeNull()
  })

  it.each(['', 'abc', 'a.', '.b', 'a.b'])('rejects malformed %j', (token) => {
    expect(verifyAdminToken(token)).toBeNull()
  })

  it('is read from the cookie among others', () => {
    const req = new Request('https://x.test', {
      headers: { cookie: 'a=1; instawedding_admin_token=abc.def; b=2' },
    })
    expect(getAdminTokenFromRequest(req)).toBe('abc.def')
  })
})

describe('OTP challenge', () => {
  const issue = () =>
    createOtpChallengeToken(EMAIL, '123456', 'moderator', 'Ana')

  it('accepts the right code and normalizes the email', () => {
    expect(
      verifyOtpChallenge(issue(), ` ${EMAIL.toUpperCase()} `, '123456')
    ).toEqual({ valid: true, role: 'moderator', name: 'Ana' })
  })

  it('rejects a wrong code, another email and a tampered token', () => {
    const token = issue()
    expect(verifyOtpChallenge(token, EMAIL, '000000').valid).toBe(false)
    expect(verifyOtpChallenge(token, 'b@example.com', '123456').valid).toBe(
      false
    )
    expect(verifyOtpChallenge(`x${token}`, EMAIL, '123456').valid).toBe(false)
  })

  it('expires after 10 minutes', () => {
    const token = issue()
    vi.advanceTimersByTime(601_000)
    expect(verifyOtpChallenge(token, EMAIL, '123456').valid).toBe(false)
  })
})

it('timingSafeCompare handles different lengths', () => {
  expect(timingSafeCompare('abc', 'abc')).toBe(true)
  expect(timingSafeCompare('abc', 'abd')).toBe(false)
  expect(timingSafeCompare('abc', 'abcd')).toBe(false)
})
