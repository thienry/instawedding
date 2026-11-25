// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSlideshow } from '@/features/projector/hooks/useSlideshow'

import type { Post } from '@/types/domain'

vi.mock('@/features/projector/utils/slide-media', () => ({
  loadSlideMedia: () => Promise.resolve({ ratio: 1, durationMs: 8000 }),
}))

function makePost(id: string, challengeId: number | null = null): Post {
  return {
    id,
    authorName: id,
    mediaUrl: `/media/${id}.webp`,
    caption: null,
    challengeId,
    likesCount: 0,
    isApproved: true,
    createdAt: '2026-12-12T20:00:00Z',
  }
}

const [a, b, c] = [makePost('a', 1), makePost('b', 1), makePost('c', 1)]
const n = makePost('n')
const m = makePost('m')

async function setup() {
  const view = renderHook(
    ({ posts, newPost }: { posts: readonly Post[]; newPost: Post | null }) =>
      useSlideshow(posts, newPost),
    { initialProps: { posts: [a, b, c] as readonly Post[], newPost: null as Post | null } }
  )
  await act(async () => {})
  const run = (action: () => void) =>
    act(async () => {
      action()
    })
  return {
    show: () => view.result.current,
    current: () => view.result.current.slides[view.result.current.index]?.id,
    run,
    update: (posts: readonly Post[], newPost: Post | null) =>
      run(() => view.rerender({ posts, newPost })),
    wait: () => act(() => vi.advanceTimersByTimeAsync(8000)),
  }
}

describe('useSlideshow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('goes on from where it was after a new post', async () => {
    const t = await setup()
    await t.wait()
    expect(t.current()).toBe('b')
    await t.update([n, a, b, c], n)
    expect(t.current()).toBe('n')
    await t.wait()
    expect(t.current()).toBe('c')
  })

  it('keeps the place through several new posts', async () => {
    const t = await setup()
    await t.wait()
    await t.update([n, a, b, c], n)
    await t.update([m, n, a, b, c], m)
    expect(t.current()).toBe('m')
    await t.wait()
    expect(t.current()).toBe('c')
  })

  it('does not stop when the interrupted post was the last one', async () => {
    const t = await setup()
    await t.run(() => t.show().showPrevious())
    expect(t.current()).toBe('c')
    await t.update([n, a, b, c], n)
    await t.wait()
    expect(t.current()).toBe('a')
    await t.wait()
    expect(t.current()).toBe('b')
  })

  it('goes back to the interrupted post', async () => {
    const t = await setup()
    await t.wait()
    await t.update([n, a, b, c], n)
    await t.run(() => t.show().showPrevious())
    expect(t.current()).toBe('b')
  })

  it('goes on when the interrupted post is removed', async () => {
    const t = await setup()
    await t.wait()
    await t.update([n, a, b, c], n)
    await t.update([n, a, c], n)
    await t.wait()
    expect(t.current()).toBe('c')
  })

  it('returns to the interrupted post when the new one is removed', async () => {
    const t = await setup()
    await t.wait()
    await t.update([n, a, b, c], n)
    await t.update([a, b, c], null)
    expect(t.current()).toBe('b')
  })

  it('is not interrupted while paused', async () => {
    const t = await setup()
    await t.wait()
    await t.run(() => t.show().togglePause())
    await t.update([n, a, b, c], n)
    expect(t.current()).toBe('b')
  })

  it('is not interrupted by a post outside the filter', async () => {
    const t = await setup()
    await t.run(() => t.show().setFilterMode('challenges'))
    await t.run(() => t.show().showNext())
    await t.update([n, a, b, c], n)
    expect(t.current()).toBe('b')
  })
})
