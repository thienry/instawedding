import { expect, it, vi } from 'vitest'

import { describeUploadFailure, withTimeout } from '@/services/offline-queue/upload-failure'
import { StorageUploadError } from '@/services/r2/r2-storage.service'

it('shows what the server refused and does not insist', () => {
  expect(describeUploadFailure(new StorageUploadError('Entre com sua conta.', 401))).toEqual({
    message: 'Entre com sua conta.',
    isPermanent: true,
  })
  const limited = describeUploadFailure(new StorageUploadError('Muitos envios.', 429))
  expect(limited).toEqual({ message: 'Muitos envios.', isPermanent: false })
})

it('recognizes a post refused by the database', () => {
  const error = new Error('denied', { cause: { code: '42501' } })
  expect(describeUploadFailure(error).isPermanent).toBe(true)
})

it('hides internal errors and lets them be retried', () => {
  for (const error of [new Error('boom'), new StorageUploadError('boom', 500), 'boom', null]) {
    const failure = describeUploadFailure(error)
    expect(failure.isPermanent).toBe(false)
    expect(failure.message).not.toContain('boom')
  }
})

it('gives up on a request that never answers', async () => {
  vi.useFakeTimers()
  const result = expect(withTimeout(new Promise(() => {}), 1000)).rejects.toThrow('timed out')
  await vi.advanceTimersByTimeAsync(1000)
  await result
  vi.useRealTimers()
})
