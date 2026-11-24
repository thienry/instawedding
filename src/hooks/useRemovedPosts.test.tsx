// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { useRemovedPosts } from '@/hooks/useRemovedPosts'

import type { Post } from '@/types/domain'

const getVisiblePostIds = vi.fn()
vi.mock('@/services/repositories.factory', () => ({
  getPostRepository: () => ({ getVisiblePostIds }),
}))

const posts = [{ id: 'a' }, { id: 'b' }] as Post[]
const wait = () => act(() => vi.advanceTimersByTimeAsync(1000))

beforeEach(() => {
  vi.useFakeTimers()
  getVisiblePostIds.mockReset()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('reports the posts that are gone', async () => {
  getVisiblePostIds.mockResolvedValue(new Set(['a']))
  const onRemoved = vi.fn()
  renderHook(() => useRemovedPosts(posts, 1000, onRemoved))
  await wait()
  expect(onRemoved).toHaveBeenCalledExactlyOnceWith(new Set(['b']))
})

it('keeps everything when the check fails', async () => {
  getVisiblePostIds.mockRejectedValue(new Error('offline'))
  const onRemoved = vi.fn()
  renderHook(() => useRemovedPosts(posts, 1000, onRemoved))
  await wait()
  await wait()
  expect(getVisiblePostIds).toHaveBeenCalledTimes(2)
  expect(onRemoved).not.toHaveBeenCalled()
})
