// Lives in _lib because any other file under api/ becomes a Vercel Function.
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET as auth } from '../admin/auth.js'
import { POST as ceremonialists } from '../admin/ceremonialists.js'
import { POST as challenges } from '../admin/challenges.js'
import { POST as moderate } from '../admin/moderate.js'
import { POST as otp } from '../admin/otp.js'
import { POST as uploadUrl } from '../upload-url.js'
import { createAdminToken } from './security.js'

const ADMIN = 'admin@x.test'
const MOD = 'mod@x.test'
const GUEST = 'guest@x.test'

const db = vi.hoisted(() => ({
  ceremonialists: [] as { email: string; name: string }[],
  writes: [] as string[],
  hits: new Map<string, number>(),
  limiterDown: false,
}))

// Bearer tokens are just emails; queries record their writes.
vi.mock('./supabase.js', () => {
  const query = (table: string) => {
    let email = ''
    const result = () => ({
      data:
        table === 'ceremonialists' && email
          ? (db.ceremonialists.find((c) => c.email === email) ?? null)
          : { is_approved: true, is_active: true },
      error: null,
    })
    const rows = () => ({ data: [{ id: '1' }], error: null })
    const builder: Record<string, unknown> = {
      eq: (column: string, value: string) => {
        if (column === 'email') email = value
        return builder
      },
      maybeSingle: async () => result(),
      single: async () => result(),
      then: (resolve: (value: unknown) => void) => resolve(rows()),
    }
    for (const read of ['select', 'order', 'neq']) builder[read] = () => builder
    for (const write of ['insert', 'update', 'delete']) {
      builder[write] = () => {
        db.writes.push(`${table}.${write}`)
        return builder
      }
    }
    return builder
  }
  return {
    createServiceClient: () => ({
      from: query,
      rpc: async (
        _name: string,
        { p_key, p_max }: { p_key: string; p_max: number }
      ) => {
        if (db.limiterDown) return { data: null, error: { message: 'down' } }
        const hits = (db.hits.get(p_key) ?? 0) + 1
        db.hits.set(p_key, hits)
        return { data: hits <= p_max, error: null }
      },
    }),
    getBearerUser: async (req: Request) => {
      const email = req.headers.get('authorization')?.slice(7)
      if (!email) return null
      const confirmed = !email.startsWith('unconfirmed:')
      return {
        id: email,
        email: email.replace('unconfirmed:', ''),
        email_confirmed_at: confirmed ? '2026-01-01' : undefined,
      }
    },
  }
})

const bearer = (email: string) => ({ authorization: `Bearer ${email}` })
const cookie = (email: string, role: 'admin' | 'moderator') => ({
  cookie: `instawedding_admin_token=${createAdminToken(role, email, 'X')}`,
})
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://x.test/api', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('ADMIN_EMAILS', ADMIN)
  vi.stubEnv('MODERATOR_EMAILS', '')
  vi.stubEnv('VITE_MODERATOR_EMAILS', '')
  vi.stubEnv('RESEND_API_KEY', '')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
  db.ceremonialists = [{ email: MOD, name: 'Mia' }]
  db.writes = []
  db.hits.clear()
  db.limiterDown = false
})

describe('identity', () => {
  const role = async (headers: Record<string, string>) => {
    const response = await auth(new Request('https://x.test', { headers }))
    const body = (await response.json()) as { user?: { role: string } }
    return body.user?.role ?? null
  }

  it('accepts Google sessions and OTP cookies', async () => {
    expect(await role(bearer(ADMIN))).toBe('admin')
    expect(await role(bearer(MOD))).toBe('moderator')
    expect(await role(cookie(MOD, 'moderator'))).toBe('moderator')
    expect(await role({ ...bearer(GUEST), ...cookie(ADMIN, 'admin') })).toBe(
      'admin'
    )
  })

  it('rejects guests, unconfirmed emails and nobody', async () => {
    expect(await role(bearer(GUEST))).toBeNull()
    expect(await role(bearer(`unconfirmed:${ADMIN}`))).toBeNull()
    expect(await role({})).toBeNull()
  })

  it('revokes a removed moderator and ignores the role in the cookie', async () => {
    expect(await role(cookie(MOD, 'admin'))).toBe('moderator')
    db.ceremonialists = []
    expect(await role(cookie(MOD, 'admin'))).toBeNull()
  })
})

const ENDPOINTS = { moderate, challenges, ceremonialists }
type Case = [keyof typeof ENDPOINTS, Record<string, unknown>, number]

const CASES: Case[] = [
  ['moderate', { action: 'list_posts' }, 200],
  ['moderate', { action: 'toggle_approval', postId: '1' }, 200],
  ['moderate', { action: 'delete_post', postId: '1' }, 403],
  ['moderate', { action: 'clear_all' }, 403],
  ['challenges', { action: 'create', title: 'a', description: 'b' }, 200],
  ['challenges', { action: 'toggle', id: 1 }, 200],
  ['challenges', { action: 'delete', id: 1 }, 403],
  ['ceremonialists', { action: 'list' }, 403],
  ['ceremonialists', { action: 'add', email: 'n@x.test' }, 403],
  ['ceremonialists', { action: 'remove', id: '1' }, 403],
]

describe.each(CASES)('%s %j', (name, body, moderatorStatus) => {
  const call = async (headers?: Record<string, string>) =>
    (await ENDPOINTS[name](post(body, headers))).status

  it('is closed to guests', async () => {
    expect(await call()).toBe(401)
    expect(await call(bearer(GUEST))).toBe(401)
    expect(db.writes).toEqual([])
  })

  it('respects roles', async () => {
    expect(await call(bearer(MOD))).toBe(moderatorStatus)
    if (moderatorStatus === 403) expect(db.writes).toEqual([])
    expect(await call(bearer(ADMIN))).toBe(200)
  })
})

it.each([
  ['moderate', { action: 'delete_post' }],
  ['moderate', { action: 'nope' }],
  ['challenges', { action: 'delete', id: '1 or 1=1' }],
  ['challenges', { action: 'create', title: ' ', description: 'b' }],
  ['ceremonialists', { action: 'add', email: 'invalid' }],
  ['ceremonialists', null],
] as [keyof typeof ENDPOINTS, unknown][])(
  '%s rejects %j',
  async (name, body) => {
    const response = await ENDPOINTS[name](post(body, bearer(ADMIN)))
    expect(response.status).toBe(400)
    expect(db.writes).toEqual([])
  }
)

describe('OTP', () => {
  const request = (email = ADMIN) => otp(post({ action: 'request', email }))
  const challengeOf = (response: Response) =>
    response.headers.get('set-cookie')!.split(';')[0]!.split('=')[1]!
  const verify = async (challengeToken: string, code: string) =>
    (await otp(post({ action: 'verify', email: ADMIN, code, challengeToken })))
      .status
  const issue = async () => {
    const response = await request()
    const { debugCode } = (await response.json()) as { debugCode: string }
    return { challenge: challengeOf(response), code: debugCode }
  }
  const wrong = (code: string) => (code === '111111' ? '222222' : '111111')

  it('accepts a code only once', async () => {
    const { challenge, code } = await issue()
    expect(await verify(challenge, code)).toBe(200)
    expect(await verify(challenge, code)).toBe(429)
  })

  it('blocks even the right code after 5 wrong attempts', async () => {
    const { challenge, code } = await issue()
    for (let i = 0; i < 5; i++) {
      expect(await verify(challenge, wrong(code))).toBe(401)
    }
    expect(await verify(challenge, code)).toBe(429)
  })

  it('limits requested codes per email', async () => {
    for (let i = 0; i < 5; i++) expect((await request()).status).toBe(200)
    expect((await request()).status).toBe(429)
  })

  it('never exposes the code on deployments', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const response = await request()
    expect(response.status).toBe(502)
    expect(await response.text()).not.toMatch(/debugCode|\d{6}/)
    expect(console.info).not.toHaveBeenCalled()

    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubGlobal('fetch', async () => Response.json({}))
    const sent = await request()
    expect(sent.status).toBe(200)
    expect(await sent.text()).not.toContain('debugCode')
  })

  it('fails closed on deployments when the limiter is down', async () => {
    db.limiterDown = true
    expect((await request()).status).toBe(200)
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect((await request()).status).toBe(429)
  })

  it('requires the signing secret on deployments', () => {
    vi.stubEnv('ADMIN_JWT_SECRET', '')
    vi.stubEnv('VERCEL_ENV', 'production')
    expect(() => createAdminToken()).toThrow('ADMIN_JWT_SECRET')
  })
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
    expect(signed?.split(';')).toEqual([
      'content-length',
      'content-type',
      'host',
    ])
  })

  it.each([undefined, 0, -1, 1.5, '10', 25 * 1024 * 1024 + 1])(
    'rejects the size %s',
    async (sizeBytes) => {
      const res = await uploadUrl(
        post({ contentType: 'image/webp', sizeBytes }, bearer(GUEST))
      )
      expect(res.status).toBe(400)
    }
  )
})
