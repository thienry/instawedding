// @vitest-environment jsdom
import { AuthRetryableFetchError } from '@supabase/supabase-js'
import { beforeEach, expect, it, vi } from 'vitest'

import { getAuthHeaders } from '@/services/api/api.client'
import { AUTH_STORAGE_KEY } from '@/services/supabase/auth-storage-key'
import { SupabaseGuestAuthService } from '@/services/supabase/supabase-guest-auth.service'

const USER = { id: 'g1', email: 'a@x.test', user_metadata: { full_name: 'Ana' } }
const GUEST = { id: 'g1', name: 'Ana', email: 'a@x.test', avatarUrl: null }
const auth = vi.hoisted(() => ({
  emit: (_event: string, _session: unknown) => {},
  answer: {} as unknown,
  signOut: vi.fn(),
}))

vi.mock('@/services/supabase/supabase.client', () => ({
  getSupabaseClient: () => ({
    auth: {
      signOut: auth.signOut,
      getSession: async () => auth.answer,
      onAuthStateChange: (callback: typeof auth.emit) => {
        auth.emit = callback
      },
    },
  }),
}))

const offline = { data: { session: null }, error: new AuthRetryableFetchError('offline', 0) }
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('instawedding_guest_user_cache', JSON.stringify(GUEST))
})

it('keeps the guest when the session cannot be renewed', async () => {
  auth.answer = offline
  const service = new SupabaseGuestAuthService()
  auth.emit('INITIAL_SESSION', null)
  await settle()
  expect(service.getCurrentGuest()).toEqual(GUEST)
  await expect(getAuthHeaders()).rejects.toThrow('offline')
})

it('forgets the guest whose session is over', async () => {
  auth.answer = { data: { session: null }, error: null }
  const service = new SupabaseGuestAuthService()
  await settle()
  expect(service.getCurrentGuest()).toBeNull()
  expect(await getAuthHeaders()).toEqual({})

  auth.emit('SIGNED_IN', { user: USER })
  expect(service.getCurrentGuest()).toEqual(GUEST)
  auth.emit('SIGNED_OUT', null)
  expect(service.getCurrentGuest()).toBeNull()
})

it('announces only what changed', async () => {
  auth.answer = { data: { session: { user: USER } }, error: null }
  const service = new SupabaseGuestAuthService()
  const listener = vi.fn()
  service.onAuthStateChange(listener)
  await settle()
  auth.emit('SIGNED_IN', { user: USER })
  expect(listener).not.toHaveBeenCalled()
  auth.emit('SIGNED_IN', { user: { ...USER, id: 'g2' } })
  expect(listener).toHaveBeenCalledOnce()
})

it('forgets the session even when the server cannot be reached', async () => {
  auth.answer = offline
  const service = new SupabaseGuestAuthService()
  localStorage.setItem(AUTH_STORAGE_KEY, 'session')
  auth.signOut.mockResolvedValue({ error: new Error('offline') })
  await service.logout()
  expect(service.getCurrentGuest()).toBeNull()
  expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
})
