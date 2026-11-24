import { beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('fetch', () => Promise.reject(new Error('Network access is disabled in tests')))
})
