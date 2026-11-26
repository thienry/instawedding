import { expect, it } from 'vitest'

import {
  getUpcomingPosts,
  isShownOnProjector,
  selectMomentSlides,
  selectSlides,
} from '@/features/projector/utils/projector-posts'

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

const posts = [
  post('a'),
  post('b', { likesCount: 5 }),
  post('c', { challengeId: 1, likesCount: 2 }),
]
const ids = (list: readonly Post[]) => list.map(({ id }) => id)

it('selects the slides of each mode without changing the input', () => {
  expect(ids(selectSlides(posts, 'all'))).toEqual(['a', 'b', 'c'])
  expect(ids(selectSlides(posts, 'highlights'))).toEqual(['b', 'c', 'a'])
  expect(ids(selectSlides(posts, 'challenges'))).toEqual(['c'])
  expect(ids(posts)).toEqual(['a', 'b', 'c'])
})

it('shows the posts of the moment, or every post until the first one', () => {
  expect(ids(selectMomentSlides(posts, 1))).toEqual(['c'])
  expect(ids(selectMomentSlides(posts, 7))).toEqual(['a', 'b', 'c'])
})

it('shows every post when there are no challenge posts', () => {
  expect(ids(selectSlides(posts.slice(0, 2), 'challenges'))).toEqual(['a', 'b'])
})

it('lists the upcoming posts, wrapping around', () => {
  expect(ids(getUpcomingPosts(posts, 1, 5))).toEqual(['c', 'a'])
  expect(ids(getUpcomingPosts(posts, 0, 1))).toEqual(['b'])
  expect(getUpcomingPosts(posts.slice(0, 1), 0, 5)).toEqual([])
})

it('hides only the posts that opted out', () => {
  expect(isShownOnProjector(post('a'))).toBe(true)
  expect(isShownOnProjector(post('a', { showOnProjector: false }))).toBe(false)
})
