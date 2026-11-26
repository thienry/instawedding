import { expect, it } from 'vitest'

import { findBannedTerm, normalizeText } from '@/utils/banned-terms'

import type { Post } from '@/types/domain'

const post = (caption: string | null, authorName = 'Bia'): Post => ({
  id: '1',
  authorName,
  mediaUrl: '/media/a.webp',
  caption,
  challengeId: null,
  likesCount: 0,
  isApproved: true,
  createdAt: '2026-12-12T22:00:00Z',
})

it('ignores case, accents and punctuation', () => {
  expect(normalizeText('  Não, é ÓTIMO!! ')).toBe('nao e otimo')
  expect(findBannedTerm(post('Que MERDÁ, hein'), ['merda'])).toBe('merda')
})

it('matches whole words and phrases', () => {
  expect(findBannedTerm(post('Vamos curtir'), ['cu'])).toBeNull()
  expect(findBannedTerm(post('olha o cu'), ['cu'])).toBe('cu')
  expect(findBannedTerm(post('Ex da noiva chegou'), ['ex da noiva'])).toBe('ex da noiva')
})

it('checks the author name and posts without a caption', () => {
  expect(findBannedTerm(post(null, 'Zé Bosta'), ['bosta'])).toBe('bosta')
  expect(findBannedTerm(post(null), ['bosta'])).toBeNull()
  expect(findBannedTerm(post('bosta'), [])).toBeNull()
})
