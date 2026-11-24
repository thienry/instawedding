// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { R2StorageService } from '@/services/r2/r2-storage.service'

vi.mock('@/services/api/api.client', () => ({ getAuthHeaders: async () => ({}) }))

class FakeXhr {
  static last: FakeXhr
  status = 200
  statusText = ''
  upload: { onprogress?: (event: unknown) => void } = {}
  onload = () => {}
  onabort = () => {}
  onerror = () => {}
  onloadend = () => {}
  isAborted = false
  constructor() {
    FakeXhr.last = this
  }
  open() {}
  setRequestHeader() {}
  send() {}
  abort() {
    this.isAborted = true
    this.onabort()
    this.onloadend()
  }
  finish() {
    this.onload()
    this.onloadend()
  }
}

const file = new File(['x'], 'a.webp', { type: 'image/webp' })

async function start(signal?: AbortSignal) {
  const upload = new R2StorageService().uploadFile(file, undefined, signal)
  upload.catch(() => {})
  await vi.advanceTimersByTimeAsync(0)
  return { upload, xhr: FakeXhr.last }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
  vi.stubGlobal('fetch', async () =>
    Response.json({ uploadUrl: 'https://r2.test', publicUrl: '/media/a.webp' })
  )
})
afterEach(() => {
  vi.useRealTimers()
})

it('gives up when the upload stalls, but not while it advances', async () => {
  const { upload, xhr } = await start()
  for (let i = 0; i < 3; i++) {
    await vi.advanceTimersByTimeAsync(20_000)
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: i, total: 10 })
  }
  expect(xhr.isAborted).toBe(false)
  await vi.advanceTimersByTimeAsync(30_000)
  await expect(upload).rejects.toThrow('aborted')
})

it('stops sending when cancelled', async () => {
  const controller = new AbortController()
  const { upload, xhr } = await start(controller.signal)
  controller.abort()
  expect(xhr.isAborted).toBe(true)
  await expect(upload).rejects.toThrow('aborted')
})

it('resolves to the public address', async () => {
  const { upload, xhr } = await start()
  xhr.finish()
  expect(await upload).toBe('/media/a.webp')
  await vi.advanceTimersByTimeAsync(60_000)
  expect(xhr.isAborted).toBe(false)
})
