import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { beforeEach, expect, it, vi } from 'vitest'

import type { CreatePostDTO } from '@/types/domain'

const uploadFile = vi.fn()
const createPost = vi.fn()
const cacheBlurPlaceholder = vi.fn()

vi.mock('@/services/storage.factory', () => ({
  getStorageService: () => ({ uploadFile }),
}))
vi.mock('@/services/repositories.factory', () => ({
  getPostRepository: () => ({ createPost, deletePost: vi.fn() }),
}))
vi.mock('@/utils/blur-placeholder', () => ({
  cacheBlurPlaceholder: (...args: unknown[]) => cacheBlurPlaceholder(...args),
  generateBlurPlaceholder: async () => 'data:blur',
}))
vi.mock('@/utils/video', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/video')>()),
  extractVideoPoster: async () => 'data:poster',
}))

const network = { onLine: true }
let stored: Record<string, string> = {}

// A fresh module simulates reloading the app with the same IndexedDB.
async function loadApp() {
  vi.resetModules()
  const { OfflineQueueService } =
    await import('@/services/offline-queue.service')
  return OfflineQueueService
}

const photo = () => new File(['photo'], 'a.webp', { type: 'image/webp' })

const submit = (queue: Awaited<ReturnType<typeof loadApp>>, file = photo()) =>
  queue.submitInBackground({
    file,
    authorName: 'Ana',
    authorAvatarUrl: 'https://x.test/ana.png',
    caption: 'Oi',
    challengeId: 3,
    clientSessionId: 'session-1',
  })

/** Writes a record straight to the database, as an older version would. */
async function storeRecord(record: Record<string, unknown>) {
  const db = await new Promise<IDBDatabase>((resolve) => {
    const request = indexedDB.open('instawedding_media_queue_db', 1)
    request.onupgradeneeded = () =>
      request.result.createObjectStore('pending_uploads', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
  })
  await new Promise<void>((resolve) => {
    const tx = db.transaction('pending_uploads', 'readwrite')
    tx.objectStore('pending_uploads').put({
      fileBlob: new Blob(['old']),
      fileName: 'old.webp',
      fileType: 'image/webp',
      authorName: 'Bia',
      caption: null,
      challengeId: null,
      clientSessionId: 's',
      status: 'failed',
      createdAt: '2026-01-01T00:00:00.000Z',
      ...record,
    })
    tx.oncomplete = () => resolve()
  })
  db.close()
}

beforeEach(() => {
  network.onLine = true
  stored = {}
  vi.stubGlobal('navigator', network)
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored[key] ?? null,
    setItem: (key: string, value: string) => {
      stored[key] = value
    },
  })
  cacheBlurPlaceholder.mockReset()
  uploadFile.mockReset().mockResolvedValue('https://x.test/a.webp')
  createPost
    .mockReset()
    .mockImplementation(async (dto: CreatePostDTO) => ({ id: 'p1', ...dto }))
})

it('sends every detail of the post', async () => {
  const queue = await loadApp()
  const id = await submit(queue)
  await vi.waitFor(() => expect(queue.getTasksSnapshot()).toEqual([]))
  expect(createPost).toHaveBeenCalledExactlyOnceWith({
    id,
    authorName: 'Ana',
    authorAvatarUrl: 'https://x.test/ana.png',
    mediaUrl: 'https://x.test/a.webp',
    mediaType: 'image',
    caption: 'Oi',
    challengeId: 3,
    clientSessionId: 'session-1',
    showOnProjector: true,
  })
  expect(cacheBlurPlaceholder.mock.calls).toEqual([
    ['https://x.test/a.webp', 'data:blur'],
    [id, 'data:blur'],
  ])
})

it('reports progress from 8 to 96', async () => {
  uploadFile.mockImplementation(
    async (_file: File, onProgress: (pct: number) => void) => {
      for (const pct of [0, 50, 100]) onProgress(pct)
      return 'https://x.test/a.webp'
    }
  )
  const queue = await loadApp()
  const progress: (number | undefined)[] = []
  queue.subscribe((tasks) => progress.push(tasks[0]?.progress))
  await vi.waitFor(() => expect(progress).toHaveLength(1))
  await submit(queue)
  await vi.waitFor(() => expect(queue.getTasksSnapshot()).toEqual([]))
  await vi.waitFor(() => expect(progress.at(-1)).toBeUndefined())
  expect(progress).toEqual([undefined, 8, 10, 12, 45, 90, 96, undefined])
})

it('stops notifying after unsubscribing', async () => {
  const queue = await loadApp()
  const onChange = vi.fn()
  const onPublished = vi.fn()
  const stopChanges = queue.subscribe(onChange)
  const stopPublished = queue.onPostPublished(onPublished)
  await vi.waitFor(() => expect(onChange).toHaveBeenCalledOnce())
  stopChanges()
  stopPublished()
  await submit(queue)
  await vi.waitFor(() => expect(queue.getTasksSnapshot()).toEqual([]))
  expect(onChange).toHaveBeenCalledOnce()
  expect(onPublished).not.toHaveBeenCalled()
})

it('frees the preview when the upload finishes or is cancelled', async () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL')
  const queue = await loadApp()
  await submit(queue)
  await vi.waitFor(() => expect(queue.getTasksSnapshot()).toEqual([]))
  expect(revoke).toHaveBeenCalledOnce()
  network.onLine = false
  await queue.cancelTask(await submit(queue))
  expect(revoke).toHaveBeenCalledTimes(2)
})

it('keeps the poster and type of a video after a reload', async () => {
  network.onLine = false
  const video = new File(['v'], 'a.mp4', { type: 'video/mp4' })
  await submit(await loadApp(), video)
  const reloaded = await loadApp()
  await reloaded.hydrateFromIdb()
  expect(reloaded.getTasksSnapshot()[0]).toMatchObject({
    mediaType: 'video',
    blurDataUrl: 'data:poster',
    authorAvatarUrl: 'https://x.test/ana.png',
    challengeId: 3,
    progress: 0,
    status: 'queued-offline',
  })
  network.onLine = true
  await reloaded.flush()
  const file = uploadFile.mock.calls[0]?.[0] as File
  expect([file.name, file.type]).toEqual(['a.mp4', 'video/mp4'])
})

it('restores records of older versions, newest first', async () => {
  await storeRecord({ id: 'photo', status: 'uploading' })
  await storeRecord({
    id: 'video',
    fileName: 'old.mp4',
    fileType: 'video/mp4',
    createdAt: '2026-02-01T00:00:00.000Z',
  })
  const queue = await loadApp()
  await queue.hydrateFromIdb()
  expect(queue.getTasksSnapshot()).toMatchObject([
    { id: 'video', mediaType: 'video', status: 'failed' },
    {
      id: 'photo',
      mediaType: 'image',
      status: 'failed',
      showOnProjector: true,
    },
  ])
  expect(await queue.flush()).toBe(2)
})

it('waits for the network when it drops during the upload', async () => {
  uploadFile.mockImplementation(async () => {
    network.onLine = false
    throw new Error('boom')
  })
  const queue = await loadApp()
  await submit(queue)
  await vi.waitFor(
    () =>
      expect(queue.getTasksSnapshot()[0]).toMatchObject({
        status: 'queued-offline',
        progress: 0,
        errorMessage: expect.stringContaining('Sem sinal no momento'),
      }),
    { timeout: 3000 }
  )
})

it('does not send the same task twice at once', async () => {
  let finish = (_url: string) => {}
  uploadFile.mockReturnValue(new Promise((resolve) => (finish = resolve)))
  const queue = await loadApp()
  const id = await submit(queue)
  await queue.retryTask(id)
  expect(await queue.flush()).toBe(0)
  finish('https://x.test/a.webp')
  await vi.waitFor(() => expect(queue.getTasksSnapshot()).toEqual([]))
  expect(uploadFile).toHaveBeenCalledOnce()
})

it('sends the queue of the first version and keeps what failed', async () => {
  const item = (id: string) => ({ id, dto: { authorName: id }, queuedAt: '' })
  stored.instawedding_offline_post_queue = JSON.stringify([
    item('a'),
    item('b'),
  ])
  createPost.mockRejectedValueOnce(new Error('boom'))
  const queue = await loadApp()
  expect(await queue.flush()).toBe(1)
  expect(JSON.parse(stored.instawedding_offline_post_queue)).toEqual([
    item('a'),
  ])
  stored.instawedding_offline_post_queue = 'broken'
  expect(await queue.flush()).toBe(0)
})

it('resumes what is stored even while the feed is restoring it', async () => {
  network.onLine = false
  await submit(await loadApp())
  network.onLine = true
  const queue = await loadApp()
  queue.subscribe(() => {})
  expect(await queue.flush()).toBe(1)
})

it('keeps going when the device cannot store the upload', async () => {
  const { put } = IDBObjectStore.prototype
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    value: unknown
  ) {
    const request = put.call(this, value)
    // Full device: the request succeeds, then the transaction is aborted
    request.addEventListener('success', () => this.transaction.abort())
    return request
  })
  const queue = await loadApp()
  await submit(queue)
  await vi.waitFor(() => expect(createPost).toHaveBeenCalledOnce())
})

it('uses the same id when the creation is retried', async () => {
  createPost.mockRejectedValueOnce(new Error('answer lost'))
  const queue = await loadApp()
  const id = await submit(queue)
  await vi.waitFor(() => expect(createPost).toHaveBeenCalledTimes(2), {
    timeout: 3000,
  })
  expect(createPost.mock.calls.map(([dto]) => dto.id)).toEqual([id, id])
})

it('keeps the id of the first version queue', async () => {
  stored.instawedding_offline_post_queue = JSON.stringify([
    { id: 'a', dto: { authorName: 'Ana' }, queuedAt: '' },
  ])
  await (await loadApp()).flush()
  expect(createPost).toHaveBeenCalledWith({ id: 'a', authorName: 'Ana' })
})

it('still uploads without IndexedDB', async () => {
  vi.stubGlobal('indexedDB', undefined)
  const queue = await loadApp()
  await submit(queue)
  await vi.waitFor(() => expect(createPost).toHaveBeenCalledOnce())
})
