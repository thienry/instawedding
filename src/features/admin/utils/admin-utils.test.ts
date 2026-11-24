import { expect, it } from 'vitest'

import { computeAdminStats } from '@/features/admin/utils/admin-stats'
import { albumEntryName, buildPostsCsv } from '@/features/admin/utils/album-export'

import type { Post } from '@/types/domain'

const post = (values: Partial<Post> = {}): Post => ({
  id: 'p1',
  clientSessionId: 'g1',
  authorName: 'Zé da Silva',
  mediaUrl: '/media/a.webp',
  caption: null,
  challengeId: null,
  likesCount: 1,
  isApproved: true,
  createdAt: '2026-01-01T12:00:00Z',
  ...values,
})

it('names album entries by position, author and media type', () => {
  expect(albumEntryName(post(), 0)).toBe('foto-001-ze-da-silva.webp')
  expect(albumEntryName(post({ authorName: '???', mediaUrl: '/media/a.mp4' }), 11)).toBe(
    'foto-012-convidado.mp4'
  )
})

it('escapes quotes and separators in the CSV', () => {
  const [header, row] = buildPostsCsv([
    post({ authorName: 'Ana "Nina"', caption: 'a;b', isApproved: false }),
  ]).split('\r\n')
  expect(header).toBe('ID;Autor;Tipo;Curtidas;Desafio;Legenda;Data;Status;URL')
  expect(row).toMatch(/^p1;"Ana ""Nina""";[^;]+;1;"";"a;b";/)
  expect(row).toMatch(/;Oculto;"\/media\/a\.webp"$/)
})

it.each(['=1+1', '+1', '-1', '@SUM(A1)', ' =1+1', '\t=1+1', '\r=1+1'])(
  'keeps %j as plain text in the CSV',
  (text) => {
    const csv = buildPostsCsv([post({ authorName: text, caption: text, mediaUrl: text })])
    expect(csv.split(`"'${text}"`)).toHaveLength(4)
  }
)

it('computes the event metrics', () => {
  const stats = computeAdminStats([
    post(),
    post({ id: 'p2', mediaUrl: '/media/b.mp4', challengeId: 1 }),
    post({ id: 'p3', authorName: 'Ana', likesCount: 9, isApproved: false }),
  ])
  expect(stats).toMatchObject({
    totalPosts: 3,
    approvedPosts: 2,
    totalPhotos: 2,
    totalVideos: 1,
    topAuthor: { name: 'Zé da Silva', postCount: 2 },
    challengePosts: 1,
    challengeRate: 33,
  })
  expect(stats.topLikedPost?.id).toBe('p3')
  expect(computeAdminStats([])).toMatchObject({
    topLikedPost: null,
    topAuthor: null,
    challengeRate: 0,
  })
})
