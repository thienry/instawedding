import { beforeEach, expect, it, vi } from 'vitest'

import { SupabaseReactionService } from '@/services/supabase/supabase-reaction.service'

type Handler = (message: { payload?: unknown }) => void

const { channel, presence } = vi.hoisted(() => ({
  channel: { on: vi.fn(), subscribe: vi.fn(), httpSend: vi.fn() },
  presence: {
    on: vi.fn(),
    subscribe: vi.fn(),
    presenceState: vi.fn(),
    track: vi.fn(),
    untrack: vi.fn(),
  },
}))
vi.mock('@/services/supabase/supabase.client', () => ({
  getSupabaseClient: () => ({
    channel: (topic: string) => (topic === 'projector-presence' ? presence : channel),
  }),
}))

beforeEach(() => {
  vi.resetAllMocks()
  channel.on.mockReturnValue(channel)
  presence.on.mockReturnValue(presence)
})

it('sends without joining the channel', async () => {
  channel.httpSend.mockResolvedValue({ success: true })
  await new SupabaseReactionService().send(['❤️'])
  expect(channel.httpSend).toHaveBeenCalledWith('reaction', { emojis: ['❤️'] }, expect.anything())
  expect(channel.subscribe).not.toHaveBeenCalled()
})

it('reports a failed send', async () => {
  channel.httpSend.mockRejectedValue(new Error('offline'))
  await expect(new SupabaseReactionService().send(['❤️'])).rejects.toThrow('offline')
})

it('joins once, delivers valid reactions and stops on request', () => {
  const service = new SupabaseReactionService()
  service.subscribe(vi.fn())()
  const callback = vi.fn()
  const unsubscribe = service.subscribe(callback)
  expect(channel.subscribe).toHaveBeenCalledOnce()

  const receive = channel.on.mock.calls[0]![2] as Handler
  receive({ payload: { emojis: ['🥂', 'x'] } })
  receive({})
  expect(callback.mock.calls).toEqual([[['🥂']]])

  unsubscribe()
  receive({ payload: { emojis: ['🥂'] } })
  expect(callback).toHaveBeenCalledOnce()
})

const setStatus = (status: string) =>
  (presence.subscribe.mock.calls[0]![0] as (status: string) => void)(status)

it('announces the projector while it is receiving, also after reconnecting', () => {
  const unsubscribe = new SupabaseReactionService().subscribe(vi.fn())
  expect(presence.track).not.toHaveBeenCalled()
  setStatus('SUBSCRIBED')
  setStatus('CHANNEL_ERROR')
  expect(presence.track).toHaveBeenCalledOnce()
  setStatus('SUBSCRIBED')
  expect(presence.track).toHaveBeenCalledTimes(2)
  unsubscribe()
  expect(presence.untrack).toHaveBeenCalledOnce()
})

it('watches the projector without receiving reactions or being announced', () => {
  const callback = vi.fn()
  const unwatch = new SupabaseReactionService().watchProjector(callback)
  setStatus('SUBSCRIBED')
  const sync = presence.on.mock.calls[0]![2] as () => void
  presence.presenceState.mockReturnValue({ a: [{}] })
  sync()
  presence.presenceState.mockReturnValue({})
  sync()
  expect(callback.mock.calls).toEqual([[false], [true], [false]])
  expect(channel.subscribe).not.toHaveBeenCalled()
  expect(presence.track).not.toHaveBeenCalled()

  unwatch()
  sync()
  expect(callback).toHaveBeenCalledTimes(3)
})
