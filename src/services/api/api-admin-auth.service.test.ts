// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'

import { ApiAdminAuthService } from '@/services/api/api-admin-auth.service'

const SESSION = { access_token: 't', user: { email: 'admin@x.test', user_metadata: {} } }
const auth = vi.hoisted(() => ({
  emit: (_event: string, _session: unknown) => {},
  signOut: vi.fn(),
}))

vi.mock('@/services/supabase/supabase.client', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: SESSION } }),
      onAuthStateChange: (callback: typeof auth.emit) => {
        auth.emit = callback
      },
      signOut: auth.signOut,
    },
  }),
}))

const answer = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', async () => Response.json(body, { status }))
const settle = () => new Promise((r) => setTimeout(r, 0))
let service: ApiAdminAuthService

beforeEach(async () => {
  localStorage.clear()
  auth.signOut.mockResolvedValue({ error: null })
  service = new ApiAdminAuthService()
  answer({ user: { email: 'admin@x.test', name: 'A', role: 'admin' } })
  await service.checkSession()
})

it('stays signed in when the server cannot be asked', async () => {
  for (const fail of [
    () => vi.stubGlobal('fetch', () => Promise.reject(new Error('offline'))),
    () => answer({ error: 'x' }, 503),
  ]) {
    fail()
    auth.emit('TOKEN_REFRESHED', SESSION)
    await settle()
    expect(await service.checkSession()).toBe(true)
    expect(service.getCurrentUser()).not.toBeNull()
  }
})

it('signs out when the server denies the access', async () => {
  answer({ authenticated: false })
  auth.emit('TOKEN_REFRESHED', SESSION)
  await settle()
  expect(service.getCurrentUser()).toBeNull()
})

it('keeps the other devices signed in', async () => {
  await service.logout()
  expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
})

it('finishes later a logout that could not reach the server', async () => {
  vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')))
  await service.logout()

  const calls: string[] = []
  let isLogoutDown = true
  vi.stubGlobal('fetch', async (url: string) => {
    calls.push(url)
    if (url.endsWith('/logout')) return Response.json({}, { status: isLogoutDown ? 503 : 200 })
    return Response.json({ authenticated: false })
  })
  expect(await service.checkSession()).toBe(false)
  isLogoutDown = false
  expect(await service.checkSession()).toBe(false)
  await service.checkSession()
  expect(calls.map((url) => url.split('/').at(-1))).toEqual(['logout', 'logout', 'auth', 'auth'])
})
