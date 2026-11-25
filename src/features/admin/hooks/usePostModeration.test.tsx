// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { POSTS_PER_PAGE } from '@/features/admin/constants'
import { usePostModeration } from '@/features/admin/hooks/usePostModeration'
import { setupBrowser } from '@/test/browser'

import type { Post } from '@/types/domain'

setupBrowser()

const makePosts = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: String(i), isApproved: i > 0 }) as Post)

const renderModeration = (count: number) =>
  renderHook(
    ({ posts }) =>
      usePostModeration(
        { posts, setPosts: vi.fn() },
        { confirm: vi.fn(), notify: vi.fn(), dialog: null }
      ),
    { initialProps: { posts: makePosts(count) } }
  )

it('splits the posts into pages', () => {
  const { result } = renderModeration(POSTS_PER_PAGE + 1)
  expect(result.current.pageCount).toBe(2)
  expect(result.current.pagePosts).toHaveLength(POSTS_PER_PAGE)
  act(() => result.current.setPage(2))
  expect(result.current.pagePosts.map(({ id }) => id)).toEqual([String(POSTS_PER_PAGE)])
})

it('falls back to the last page when the current one empties', () => {
  const { result, rerender } = renderModeration(POSTS_PER_PAGE + 1)
  act(() => result.current.setPage(2))
  rerender({ posts: makePosts(POSTS_PER_PAGE) })
  expect(result.current.page).toBe(1)
  expect(result.current.pagePosts).toHaveLength(POSTS_PER_PAGE)
})

it('returns to the first page when the filter changes', () => {
  const { result } = renderModeration(POSTS_PER_PAGE * 2 + 1)
  act(() => result.current.setPage(2))
  act(() => result.current.setFilter('approved'))
  expect(result.current.page).toBe(1)
  expect(result.current.pageCount).toBe(2)
})
