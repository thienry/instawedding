import { beforeEach, expect, it, vi } from 'vitest'

import { SupabaseReactionService } from '@/services/supabase/supabase-reaction.service'

type Handler = (message: { payload?: unknown }) => void

const { channel } = vi.hoisted(() => ({
  channel: { on: vi.fn(), subscribe: vi.fn(), httpSend: vi.fn() },
}))
vi.mock('@/services/supabase/supabase.client', () => ({
  getSupabaseClient: () => ({ channel: () => channel }),
}))

beforeEach(() => {
  vi.resetAllMocks()
  channel.on.mockReturnValue(channel)
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
