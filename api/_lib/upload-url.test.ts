// Lives in _lib because any other file under api/ becomes a Vercel Function.
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST as uploadUrl } from '../upload-url.js'

const GUEST = 'guest@x.test'
const MOD = 'mod@x.test'

const db = vi.hoisted(() => ({ hits: new Map<string, number>(), limiterDown: false }))

// Bearer tokens are just emails.
vi.mock('./supabase.js', () => ({
  createServiceClient: () => ({
    rpc: async (_name: string, { p_key, p_max }: { p_key: string; p_max: number }) => {
      if (db.limiterDown) return { data: null, error: { message: 'down' } }
      const hits = (db.hits.get(p_key) ?? 0) + 1
      db.hits.set(p_key, hits)
      return { data: hits <= p_max, error: null }
    },
  }),
  getBearerUser: async (req: Request) => {
    const email = req.headers.get('authorization')?.slice(7)
    return email ? { id: email, email } : null
  },
}))

const bearer = (email: string) => ({ authorization: `Bearer ${email}` })
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://x.test/api', { method: 'POST', headers, body: JSON.stringify(body) })

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  db.hits.clear()
  db.limiterDown = false
})

describe('upload URL', () => {
  const upload = (headers?: Record<string, string>) =>
    uploadUrl(post({ contentType: 'image/webp', sizeBytes: 10 }, headers))

  beforeEach(() => {
    vi.stubEnv('R2_ACCOUNT_ID', 'acc')
    vi.stubEnv('R2_ACCESS_KEY_ID', 'key')
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret')
  })

  it('requires a signed-in guest', async () => {
    expect((await upload()).status).toBe(401)
    expect((await upload(bearer(GUEST))).status).toBe(200)
  })

  it('limits each guest separately', async () => {
    for (let i = 0; i < 60; i++) await upload(bearer(GUEST))
    expect((await upload(bearer(GUEST))).status).toBe(429)
    expect((await upload(bearer(MOD))).status).toBe(200)
  })

  it('keeps working when the limiter is down', async () => {
    db.limiterDown = true
    expect((await upload(bearer(GUEST))).status).toBe(200)
  })

  it('signs the declared size and type into the URL', async () => {
    const res = await upload(bearer(GUEST))
    const { uploadUrl: url } = (await res.json()) as { uploadUrl: string }
    const signed = new URL(url).searchParams.get('X-Amz-SignedHeaders')
    expect(signed?.split(';')).toEqual(['content-length', 'content-type', 'host'])
  })

  it.each([undefined, 0, -1, 1.5, '10', 25 * 1024 * 1024 + 1])(
    'rejects the size %s',
    async (sizeBytes) => {
      const res = await uploadUrl(post({ contentType: 'image/webp', sizeBytes }, bearer(GUEST)))
      expect(res.status).toBe(400)
    }
  )
})
