import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { CreatePostDTO } from '@/types/domain'

const uploadFile = vi.fn()
const createPost = vi.fn()
const deletePost = vi.fn()

vi.mock('@/services/storage.factory', () => ({
  getStorageService: () => ({ uploadFile }),
}))
vi.mock('@/services/repositories.factory', () => ({
  getPostRepository: () => ({ createPost, deletePost }),
}))
vi.mock('@/utils/blur-placeholder', () => ({
  cacheBlurPlaceholder: () => {},
  generateBlurPlaceholder: async () => '',
}))

const network = { onLine: true }

// A fresh module simulates reloading the app with the same IndexedDB.
async function loadApp() {
  vi.resetModules()
  const { OfflineQueueService } = await import('@/services/offline-queue.service')
  return OfflineQueueService
}

const submit = (queue: Awaited<ReturnType<typeof loadApp>>) =>
  queue.submitInBackground({
    file: new File(['photo'], 'a.webp', { type: 'image/webp' }),
    authorName: 'Ana',
    caption: 'Oi',
    challengeId: null,
    clientSessionId: 'session-1',
    showOnProjector: false,
  })

beforeEach(() => {
  network.onLine = true
  vi.stubGlobal('navigator', network)
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.stubGlobal('localStorage', undefined)
  uploadFile.mockReset().mockResolvedValue('https://x.test/a.webp')
  deletePost.mockReset().mockResolvedValue(undefined)
  createPost.mockReset().mockImplementation(async (dto: CreatePostDTO) => ({ id: 'p1', ...dto }))
})
afterEach(() => {
  vi.useRealTimers()
})

it('uploads right away when online and leaves nothing behind', async () => {
  const queue = await loadApp()
  const published = vi.fn()
  queue.onPostPublished(published)
  const id = await submit(queue)
  await vi.waitFor(() => expect(published).toHaveBeenCalledOnce())

  expect(published.mock.calls[0]?.[1]).toBe(id)
  expect(createPost).toHaveBeenCalledWith(
    expect.objectContaining({
      authorName: 'Ana',
      mediaUrl: 'https://x.test/a.webp',
      showOnProjector: false,
    })
  )
  const reloaded = await loadApp()
  await reloaded.hydrateFromIdb()
  expect(reloaded.getTasksSnapshot()).toEqual([])
})

it('queues offline and resumes after a reload', async () => {
  network.onLine = false
  await submit(await loadApp())
  expect(uploadFile).not.toHaveBeenCalled()

  const reloaded = await loadApp()
  expect(await reloaded.flush()).toBe(0)
  network.onLine = true
  expect(await reloaded.flush()).toBe(1)

  const file = uploadFile.mock.calls[0]?.[0] as File
  expect(await file.text()).toBe('photo')
  expect(createPost).toHaveBeenCalledWith(
    expect.objectContaining({ caption: 'Oi', showOnProjector: false })
  )
  expect(reloaded.getTasksSnapshot()).toEqual([])
})

it('fails after two attempts, then can be retried', async () => {
  uploadFile.mockRejectedValue(new Error('boom'))
  const queue = await loadApp()
  const id = await submit(queue)
  await vi.waitFor(
    () =>
      expect(queue.getTasksSnapshot()[0]).toMatchObject({
        status: 'failed',
        errorMessage: expect.stringContaining('Oscilação'),
      }),
    { timeout: 3000 }
  )
  expect(uploadFile).toHaveBeenCalledTimes(2)

  uploadFile.mockResolvedValue('https://x.test/a.webp')
  await queue.retryTask(id)
  expect(createPost).toHaveBeenCalledOnce()
  expect(queue.getTasksSnapshot()).toEqual([])
})

it('keeps a retry queued while offline', async () => {
  network.onLine = false
  const queue = await loadApp()
  const id = await submit(queue)
  await queue.retryTask(id)
  expect(queue.getTasksSnapshot()[0]?.status).toBe('queued-offline')
  expect(uploadFile).not.toHaveBeenCalled()
})

it('removes a cancelled task from storage', async () => {
  network.onLine = false
  const queue = await loadApp()
  await queue.cancelTask(await submit(queue))
  const reloaded = await loadApp()
  await reloaded.hydrateFromIdb()
  expect(reloaded.getTasksSnapshot()).toEqual([])
})

it('keeps the projector opt-out when a failed upload is resumed', async () => {
  uploadFile.mockRejectedValue(new Error('boom'))
  const queue = await loadApp()
  await submit(queue)
  await vi.waitFor(
    async () => {
      const reloaded = await loadApp()
      await reloaded.hydrateFromIdb()
      expect(reloaded.getTasksSnapshot()[0]?.errorMessage).toContain('Oscilação')
    },
    { timeout: 3000 }
  )

  uploadFile.mockResolvedValue('https://x.test/a.webp')
  const reloaded = await loadApp()
  await reloaded.flush()
  expect(createPost).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ showOnProjector: false })
  )
})

// Settles a mocked call by hand, so a test can cancel while it is pending.
function defer<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const settle = (ms = 50) => new Promise((r) => setTimeout(r, ms))

it('does not publish when cancelled during the upload', async () => {
  const upload = defer<string>()
  uploadFile.mockReturnValue(upload.promise)
  const queue = await loadApp()
  await queue.cancelTask(await submit(queue))
  upload.resolve('https://x.test/a.webp')
  await settle()
  expect(createPost).not.toHaveBeenCalled()
  expect(queue.getTasksSnapshot()).toEqual([])
})

it('does not retry an upload that fails after being cancelled', async () => {
  const upload = defer<string>()
  uploadFile.mockReturnValue(upload.promise)
  const queue = await loadApp()
  await queue.cancelTask(await submit(queue))
  upload.reject(new Error('boom'))
  await settle(1100)
  expect(uploadFile).toHaveBeenCalledOnce()
})

it('removes a post created while it was being cancelled', async () => {
  const creation = defer<{ id: string }>()
  createPost.mockReturnValue(creation.promise)
  const queue = await loadApp()
  const published = vi.fn()
  queue.onPostPublished(published)
  const id = await submit(queue)
  await vi.waitFor(() => expect(createPost).toHaveBeenCalled())
  await queue.cancelTask(id)
  creation.resolve({ id: 'p1' })
  await vi.waitFor(() => expect(deletePost).toHaveBeenCalledWith('p1'))
  await settle()
  expect(published).not.toHaveBeenCalled()
})

it('shows the post when its removal after a cancel fails', async () => {
  const creation = defer<{ id: string }>()
  createPost.mockReturnValue(creation.promise)
  deletePost.mockRejectedValue(new Error('offline'))
  const queue = await loadApp()
  const published = vi.fn()
  queue.onPostPublished(published)
  const id = await submit(queue)
  await vi.waitFor(() => expect(createPost).toHaveBeenCalled())
  await queue.cancelTask(id)
  creation.resolve({ id: 'p1' })
  await vi.waitFor(() => expect(published).toHaveBeenCalledWith({ id: 'p1' }, id))
  expect(createPost).toHaveBeenCalledOnce()
})

it('aborts the upload when cancelled', async () => {
  uploadFile.mockReturnValue(new Promise(() => {}))
  const queue = await loadApp()
  const id = await submit(queue)
  await queue.cancelTask(id)
  expect((uploadFile.mock.calls[0] as [File, unknown, AbortSignal])[2].aborted).toBe(true)
})

it('does not send the media again when only the post failed', async () => {
  createPost.mockRejectedValueOnce(new Error('answer lost'))
  const queue = await loadApp()
  await submit(queue)
  await vi.waitFor(() => expect(queue.getTasksSnapshot()).toEqual([]), { timeout: 3000 })
  expect(uploadFile).toHaveBeenCalledOnce()
})

it('waits for the guest after a refusal', async () => {
  createPost.mockRejectedValue(new Error('denied', { cause: { code: '42501' } }))
  const queue = await loadApp()
  const id = await submit(queue)
  await vi.waitFor(() =>
    expect(queue.getTasksSnapshot()[0]).toMatchObject({
      status: 'failed',
      isPermanentFailure: true,
    })
  )
  expect(await queue.flush()).toBe(0)
  expect(createPost).toHaveBeenCalledOnce()

  createPost.mockResolvedValue({ id })
  await queue.retryTask(id)
  expect(queue.getTasksSnapshot()).toEqual([])
})

it('leaves to the other tab what it is sending or has sent', async () => {
  network.onLine = false
  await submit(await loadApp())
  const first = await loadApp()
  const second = await loadApp()
  await first.hydrateFromIdb()
  await second.hydrateFromIdb()

  const held = new Set<string>()
  const request = async (
    name: string,
    _options: unknown,
    run: (lock: object | null) => Promise<void>
  ) => {
    if (held.has(name)) return run(null)
    held.add(name)
    await run({}).finally(() => held.delete(name))
  }
  Object.assign(network, { onLine: true, locks: { request } })
  try {
    expect(await Promise.all([first.flush(), second.flush()])).toEqual([1, 0])
    expect(await second.flush()).toBe(0)
  } finally {
    Object.assign(network, { locks: undefined })
  }
  expect(uploadFile).toHaveBeenCalledOnce()
  expect(second.getTasksSnapshot()).toEqual([])
})

it('warns when the device cannot store the post', async () => {
  network.onLine = false
  vi.stubGlobal('indexedDB', undefined)
  const queue = await loadApp()
  await submit(queue)
  expect(queue.getTasksSnapshot()[0]?.isUnsaved).toBe(true)

  vi.stubGlobal('indexedDB', new IDBFactory())
  const working = await loadApp()
  await submit(working)
  expect(working.getTasksSnapshot()[0]?.isUnsaved).toBe(false)
})
