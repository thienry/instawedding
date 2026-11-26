import { expect, it } from 'vitest'

import { getProjectorStatus } from '@/features/admin/utils/projector-status'

import type { Post } from '@/types/domain'

const post = (changes: Partial<Post> = {}): Post => ({
  id: '1',
  authorName: 'Bia',
  mediaUrl: '/media/a.webp',
  caption: 'Que bosta de música',
  challengeId: null,
  likesCount: 0,
  isApproved: true,
  createdAt: '2026-12-12T22:00:00Z',
  ...changes,
})

it('tells why a post is off the projector', () => {
  expect(getProjectorStatus(post(), [])).toEqual({ kind: 'shown' })
  expect(getProjectorStatus(post(), ['bosta'])).toEqual({ kind: 'term', term: 'bosta' })
  expect(getProjectorStatus(post({ hiddenFromProjector: true }), ['bosta']).kind).toBe('moderator')
  expect(getProjectorStatus(post({ showOnProjector: false }), []).kind).toBe('guest')
})
