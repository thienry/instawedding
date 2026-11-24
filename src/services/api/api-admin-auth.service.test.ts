import { beforeEach, expect, it, vi } from 'vitest'

import { ApiAdminAuthService } from '@/services/api/api-admin-auth.service'

const SESSION = { access_token: 't', user: { email: 'admin@x.test', user_metadata: {} } }
const auth = vi.hoisted(() => ({
  emit: (_event: string, _session: unknown) => {},
  signOut: vi.fn(async () => ({})),
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
