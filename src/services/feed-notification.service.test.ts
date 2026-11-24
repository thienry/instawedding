// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'

import type { GuestUser, Post } from '@/types/domain'

const getPosts = vi.fn()
let guest: GuestUser | null = null
let publish = (_post: Post) => {}

vi.mock('@/services/repositories.factory', () => ({
  getPostRepository: () => ({ getPosts }),
  getRealtimeService: () => ({
    subscribeToNewPosts: (callback: (post: Post) => void) => {
      publish = callback
      return () => {}
    },
  }),
}))
vi.mock('@/services/guest-auth.factory', () => ({
  getGuestAuthService: () => ({ getCurrentGuest: () => guest }),
}))
vi.mock('@/utils/session', () => ({
  getGuestSession: () => ({ sessionId: 'session-1', guestName: '' }),
}))

const KEY = 'instawedding_last_seen_post_at'
const day = (n: number) => `2026-01-0${n}T12:00:00.000Z`
const post = (id: string, n: number, extra: Partial<Post> = {}): Post => ({
  id,
  authorName: `Autor ${id}`,
  mediaUrl: '/media/a.webp',
  caption: null,
  challengeId: null,
  likesCount: 0,
  isApproved: true,
  createdAt: day(n),
  ...extra,
})
const ids = (posts: readonly Post[]) => posts.map(({ id }) => id)

// A fresh module simulates reloading the app.
async function load() {
  vi.resetModules()
  const { FeedNotificationService } = await import('@/services/feed-notification.service')
  return FeedNotificationService
}

beforeEach(() => {
  localStorage.clear()
  guest = null
  getPosts.mockReset().mockResolvedValue([])
})

it('does not count older posts on the first visit', async () => {
  const service = await load()
  service.syncWithFetchedPosts([post('a', 2), post('b', 3), post('c', 1)])
  expect(service.getState().totalUnreadCount).toBe(0)
  expect(localStorage.getItem(KEY)).toBe(day(3))
})

it('counts what was posted since the last visit, except own posts', async () => {
  localStorage.setItem(KEY, day(2))
  guest = { id: 'g1', name: 'Ana', email: '', avatarUrl: null }
  const service = await load()
  service.syncWithFetchedPosts([
    post('old', 1),
    post('new', 3),
    post('mine', 4, { clientSessionId: 'g1' }),
    post('session', 4, { clientSessionId: 'session-1' }),
    post('name', 4, { authorName: ' ANA ' }),
    post('broken', 4, { createdAt: 'x' }),
  ])
  expect([...service.getState().unseenAwayPostIds]).toEqual(['new'])
})

it('starts over when the stored date is broken', async () => {
  localStorage.setItem(KEY, 'broken')
  const service = await load()
  service.syncWithFetchedPosts([post('a', 2)])
  expect(localStorage.getItem(KEY)).toBe(day(2))
  expect(service.getState().totalUnreadCount).toBe(0)
})

it('stages live posts once and ignores own posts', async () => {
  getPosts.mockRejectedValue(new Error('offline'))
  const service = await load()
  const onChange = vi.fn()
  const stop = service.subscribe(onChange)
  await vi.waitFor(() => expect(getPosts).toHaveBeenCalledOnce())
  publish(post('a', 1))
  publish(post('a', 1))
  publish(post('b', 2))
  publish(post('mine', 3, { clientSessionId: 'session-1' }))
  expect(ids(service.getState().stagedPosts)).toEqual(['b', 'a'])
  expect(localStorage.getItem(KEY)).toBe(day(3))
  const calls = onChange.mock.calls.length
  stop()
  publish(post('c', 4))
  expect(onChange).toHaveBeenCalledTimes(calls)
})

it('keeps notifying when a listener fails', async () => {
  const service = await load()
  let isBroken = false
  service.subscribe(() => {
    if (isBroken) throw new Error('boom')
  })
  const onChange = vi.fn()
  service.subscribe(onChange)
  isBroken = true
  publish(post('a', 1))
  expect(onChange).toHaveBeenCalledTimes(2)
})

it('previews up to three authors and counts each post once', async () => {
  localStorage.setItem(KEY, day(1))
  const service = await load()
  service.initialize()
  const names = ['Ana', ' ana', '', 'Bia', 'Caio', 'Davi']
  const posts = names.map((authorName, index) => post(`p${index}`, 2, { authorName }))
  publish(posts[0]!)
  service.syncWithFetchedPosts(posts)
  const { latestAuthors, totalUnreadCount } = service.getState()
  expect(latestAuthors.map(({ name }) => name)).toEqual(['Ana', 'Bia', 'Caio'])
  expect(totalUnreadCount).toBe(6)
})

it('reveals everything unread and moves the last visit forward', async () => {
  localStorage.setItem(KEY, day(1))
  const service = await load()
  service.initialize()
  service.syncWithFetchedPosts([post('away', 2)])
  publish(post('live', 3))
  const revealed = service.consumeStagedAndMarkSeen([post('feed', 5)])
  expect(ids(revealed.stagedPosts)).toEqual(['live'])
  expect([...revealed.revealedPostIds]).toEqual(['live', 'away'])
  expect(service.getState().totalUnreadCount).toBe(0)
  expect(localStorage.getItem(KEY)).toBe(day(5))
})

it('never moves the last visit back', async () => {
  localStorage.setItem(KEY, day(5))
  const service = await load()
  service.registerOwnPublishedPost(post('mine', 2))
  expect(localStorage.getItem(KEY)).toBe(day(5))
})

it('forgets deleted and own posts', async () => {
  localStorage.setItem(KEY, day(1))
  const service = await load()
  service.initialize()
  publish(post('a', 2))
  publish(post('b', 3))
  service.removePost('a')
  service.registerOwnPublishedPost(post('b', 3))
  expect(service.getState().totalUnreadCount).toBe(0)
})

it('checks for missed posts when the app is visible again', async () => {
  const service = await load()
  localStorage.setItem(KEY, day(1))
  service.initialize()
  service.syncWithFetchedPosts([post('known', 1)])
  getPosts.mockResolvedValue([
    post('known', 1),
    post('b', 2),
    post('c', 3),
    post('mine', 4, { clientSessionId: 'session-1' }),
  ])
  document.dispatchEvent(new Event('visibilitychange'))
  await vi.waitFor(() => expect(ids(service.getState().stagedPosts)).toEqual(['c', 'b']))
})
