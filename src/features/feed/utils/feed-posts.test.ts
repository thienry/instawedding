import { expect, it } from 'vitest'

import { filterFeedPosts, isOwnPost, mergeNewPosts } from '@/features/feed/utils/feed-posts'
import { countLikes, rankContributors } from '@/utils/post-stats'

import type { FeedFilter } from '@/features/feed/utils/feed-posts'
import type { Post } from '@/types/domain'

const post = (id: string, values: Partial<Post> = {}): Post => ({
  id,
  authorName: 'Bia',
  mediaUrl: '/media/a.webp',
  caption: null,
  challengeId: null,
  likesCount: 0,
  isApproved: true,
  createdAt: '2026-01-01T12:00:00Z',
  ...values,
})

const guest = {
  guestUser: { id: 'g1', name: 'Ana', email: 'a@x.test', avatarUrl: null },
  sessionId: 's1',
}
const posts = [
  post('liked', { likesCount: 5 }),
  post('challenge', { challengeId: 1, likesCount: 9 }),
  post('account', { clientSessionId: 'g1' }),
  post('session', { clientSessionId: 's1' }),
  post('name', { authorName: ' ana ' }),
]

const filteredIds = (filter: Partial<FeedFilter>) =>
  filterFeedPosts(posts, {
    tab: 'all',
    challengeId: null,
    ...guest,
    ...filter,
  }).map(({ id }) => id)

it('filters by tab and challenge', () => {
  const allIds = posts.map(({ id }) => id)
  expect(filteredIds({})).toEqual(allIds)
  expect(filteredIds({ challengeId: Number.NaN })).toEqual(allIds)
  expect(filteredIds({ challengeId: 1 })).toEqual(['challenge'])
  expect(filteredIds({ challengeId: 2 })).toEqual([])
  expect(filteredIds({ tab: 'challenges' })).toEqual(['challenge'])
  expect(filteredIds({ tab: 'mine' })).toEqual(['account', 'session', 'name'])
  expect(filteredIds({ tab: 'mine', guestUser: null })).toEqual(['session'])
})

it('sorts by likes without changing the input', () => {
  expect(filteredIds({ tab: 'most-liked' }).slice(0, 2)).toEqual(['challenge', 'liked'])
  expect(posts[0]?.id).toBe('liked')
})

it('recognizes own posts by account or session, never by name', () => {
  const ownIds = posts.filter((item) => isOwnPost(item, guest))
  expect(ownIds.map(({ id }) => id)).toEqual(['account', 'session'])
})

it('merges only unknown posts', () => {
  const merged = mergeNewPosts([post('a')], [post('b'), post('a')])
  expect(merged.map(({ id }) => id)).toEqual(['b', 'a'])
})

it('ranks contributors by posts, then likes', () => {
  const ranking = rankContributors(
    [
      post('1', { authorName: 'Ana', likesCount: 1 }),
      post('2', { authorName: ' ana ', authorAvatarUrl: '/a.png' }),
      post('3', { authorName: 'Bia', likesCount: 2 }),
      post('4', { authorName: 'Caio', likesCount: 8 }),
      post('5', { authorName: '  ', likesCount: 99 }),
    ],
    2
  )
  expect(ranking).toEqual([
    { key: 'ana', name: 'Ana', avatarUrl: '/a.png', postCount: 2, likes: 1 },
    { key: 'caio', name: 'Caio', avatarUrl: null, postCount: 1, likes: 8 },
  ])
  expect(countLikes(posts)).toBe(14)
})

it('tells apart guests with the same name', () => {
  const ranking = rankContributors(
    [post('1', { clientSessionId: 'a' }), post('2', { clientSessionId: 'b' })],
    3
  )
  expect(ranking.map(({ postCount }) => postCount)).toEqual([1, 1])
  const other = post('1', { authorName: 'Ana', clientSessionId: 'other' })
  const mine = filterFeedPosts([other], { tab: 'mine', challengeId: null, ...guest })
  expect(mine).toEqual([])
})
