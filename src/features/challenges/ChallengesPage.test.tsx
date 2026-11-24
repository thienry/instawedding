// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { expect, it, vi } from 'vitest'

import { ChallengesPage } from '@/features/challenges/ChallengesPage'
import { getGuestAuthService } from '@/services/guest-auth.factory'
import { getChallengeRepository } from '@/services/repositories.factory'
import { setupBrowser } from '@/test/browser'

import type { Post } from '@/types/domain'

setupBrowser()

function Location() {
  const { pathname, search } = useLocation()
  return <output>{`${pathname}${search}`}</output>
}

async function open(posts: Partial<Post>[]) {
  localStorage.setItem(
    'instawedding_mock_guest_user',
    JSON.stringify({
      id: 'g1',
      name: 'Ana',
      email: 'a@x.test',
      avatarUrl: null,
    })
  )
  localStorage.setItem(
    'instawedding_mock_posts',
    JSON.stringify(
      posts.map((post, index) => ({
        id: `p${index}`,
        authorName: 'Bia',
        mediaUrl: '/media/a.webp',
        caption: null,
        challengeId: null,
        likesCount: 0,
        isApproved: true,
        createdAt: '2026-01-01T12:00:00Z',
        ...post,
      }))
    )
  )
  render(
    <MemoryRouter initialEntries={['/challenges']}>
      <Routes>
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route path="*" element={<Location />} />
      </Routes>
    </MemoryRouter>
  )
  await screen.findAllByTitle('Cumprir Desafio')
}

it('counts the guest challenges by id or by name', async () => {
  await open([
    { challengeId: 1, clientSessionId: 'g1' },
    { challengeId: 2, authorName: ' ANA ' },
    { challengeId: 3, clientSessionId: 'other' },
    { challengeId: 99, clientSessionId: 'g1' },
  ])
  screen.getByText(/2 de 5 concluídos \(40\s*%\)/)
  expect(screen.getAllByText('Concluído')).toHaveLength(2)
})

it('drops the guest progress on logout', async () => {
  await open([{ challengeId: 1, clientSessionId: 'g1' }])
  screen.getByText(/1 de 5/)
  await act(() => getGuestAuthService().logout())
  screen.getByText(/0 de 5/)
})

it('ranks the three guests who posted the most', async () => {
  await open([
    { authorName: 'Um', likesCount: 1 },
    { authorName: 'Dois', likesCount: 9 },
    { authorName: 'Três' },
    { authorName: 'três ' },
    { authorName: 'Fora' },
  ])
  const ranking = screen.getByText('Ranking').parentElement!.parentElement!
  const text = within(ranking)
    .getAllByText(/^(Um|Dois|Três|Fora)$/)
    .map((element) => element.textContent)
  expect(text).toEqual(['Três', 'Dois', 'Um'])
  within(ranking).getByText('📷 2 fotos')
})

it('opens the photos of a challenge', async () => {
  await open([{ challengeId: 2 }, { challengeId: 2 }, { challengeId: 3 }])
  screen.getByText('Ver 1 foto postada')
  fireEvent.click(screen.getByText('Ver 2 fotos postadas'))
  expect(screen.getByRole('status').textContent).toBe('/?challengeId=2')
})

it('hides the ranking without posts', async () => {
  await open([])
  expect(screen.queryByText('Ranking')).toBeNull()
})

it('reports a failed load and tries again', async () => {
  vi.spyOn(getChallengeRepository(), 'getChallenges').mockRejectedValueOnce(
    new Error('offline')
  )
  render(
    <MemoryRouter>
      <ChallengesPage />
    </MemoryRouter>
  )
  await screen.findByText(/Não foi possível carregar os desafios/)
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findAllByTitle('Cumprir Desafio')).toHaveLength(5)
  expect(screen.queryByText(/Não foi possível carregar/)).toBeNull()
})
