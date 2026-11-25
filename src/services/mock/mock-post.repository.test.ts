// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MockChallengeRepository } from '@/services/mock/mock-challenge.repository'
import { MockPostRepository } from '@/services/mock/mock-post.repository'

const broadcastNewPost = vi.fn()
let repo: MockPostRepository

beforeEach(() => {
  localStorage.clear()
  broadcastNewPost.mockClear()
  repo = new MockPostRepository(new MockChallengeRepository(), {
    broadcastNewPost,
    subscribeToNewPosts: () => () => {},
  })
})

const create = () => repo.createPost({ authorName: ' Ana ', mediaUrl: 'a.webp', challengeId: 1 })

describe('MockPostRepository', () => {
  it('creates, links the challenge and broadcasts', async () => {
    const post = await create()
    expect(post).toMatchObject({ authorName: 'Ana', isApproved: true })
    expect(post.challenge?.id).toBe(1)
    expect(broadcastNewPost).toHaveBeenCalledWith(post)
    expect((await repo.getPosts())[0]?.id).toBe(post.id)
  })

  it('does not create the same post twice', async () => {
    const dto = { id: 'p-1', authorName: 'Ana', mediaUrl: 'a.webp' }
    const first = await repo.createPost(dto)
    expect(await repo.createPost(dto)).toEqual(first)
    expect(broadcastNewPost).toHaveBeenCalledOnce()
    const posts = await repo.getPosts()
    expect(posts.filter(({ id }) => id === 'p-1')).toHaveLength(1)
  })

  it('toggles a like per session', async () => {
    const { id } = await create()
    expect(await repo.toggleLike(id, 's1')).toEqual({
      isLiked: true,
      likesCount: 1,
    })
    expect((await repo.toggleLike(id, 's2')).likesCount).toBe(2)
    expect(await repo.getLikedPostIds('s1')).toEqual(new Set([id]))
    expect(await repo.toggleLike(id, 's1')).toEqual({
      isLiked: false,
      likesCount: 1,
    })
    expect(await repo.hasUserLiked(id, 's1')).toBe(false)
  })

  it('hides unapproved posts from the feed but not from moderation', async () => {
    const { id } = await create()
    await repo.setPostApproval(id, false)
    const ids = (posts: { id: string }[]) => posts.map((p) => p.id)
    expect(ids(await repo.getPosts())).not.toContain(id)
    expect(ids(await repo.getAllPostsForModeration())).toContain(id)
    await repo.setPostApproval(id, true)
    expect(ids(await repo.getPosts())).toContain(id)
  })

  it('deletes one post and clears all', async () => {
    const { id } = await create()
    const before = (await repo.getPosts()).length
    await repo.deletePost(id)
    expect(await repo.getPosts()).toHaveLength(before - 1)
    await repo.clearAllPosts()
    expect(await repo.getPosts()).toEqual([])
  })
})
