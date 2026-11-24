// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'

import { FeedPage } from '@/features/feed/FeedPage'
import { getPostRepository } from '@/services/repositories.factory'
import { setupBrowser } from '@/test/browser'

setupBrowser()

function open(postCount: number, authorName = 'Bia') {
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
      Array.from({ length: postCount }, (_, index) => ({
        id: `p${index}`,
        authorName,
        mediaUrl: '/media/a.webp',
        caption: null,
        challengeId: null,
        likesCount: 0,
        isApproved: true,
        createdAt: '2026-01-01T12:00:00Z',
      }))
    )
  )
  return render(
    <MemoryRouter>
      <FeedPage />
    </MemoryRouter>
  )
}

it('reveals more posts on scroll and starts over on another tab', async () => {
  let reachEnd = () => {}
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private readonly callback: (entries: { isIntersecting: boolean }[]) => void
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        this.callback = callback
      }
      observe(element: Element) {
        if (!element.textContent?.startsWith('Carregando mais')) return
        reachEnd = () => this.callback([{ isIntersecting: true }])
      }
      unobserve() {}
      disconnect() {}
    }
  )
  open(30)
  const countPosts = () => screen.queryAllByRole('article').length
  await waitFor(() => expect(countPosts()).toBe(12))
  await screen.findByText('Carregando mais fotos...')
  act(() => reachEnd())
  expect(countPosts()).toBe(22)
  fireEvent.click(screen.getByRole('button', { name: 'Mais Curtidas' }))
  expect(countPosts()).toBe(12)
})

it('likes on double tap', async () => {
  const { container } = open(1)
  await screen.findByTitle('Curtir foto')
  const media = container.querySelector('article .cursor-pointer')!
  fireEvent.click(media)
  expect(screen.getByTitle('Curtir foto').textContent).toBe('0')
  fireEvent.click(media)
  await waitFor(() => expect(screen.getByTitle('Curtir foto').textContent).toBe('1'))
})

it('refreshes only when pulled past the threshold', async () => {
  const { container } = open(1)
  await screen.findByTitle('Curtir foto')
  const getPosts = vi.spyOn(getPostRepository(), 'getPosts')
  const page = container.firstElementChild!
  const pull = (distance: number) => {
    fireEvent.touchStart(page, { touches: [{ clientY: 0 }] })
    fireEvent.touchMove(page, { touches: [{ clientY: distance }] })
    fireEvent.touchEnd(page)
  }
  pull(100)
  expect(getPosts).not.toHaveBeenCalled()
  pull(200)
  await waitFor(() => expect(getPosts).toHaveBeenCalledOnce())
  await screen.findByText('Puxe para atualizar')
})

it('restores the count when a like fails', async () => {
  open(1)
  const button = await screen.findByTitle('Curtir foto')
  let rejectLike = () => {}
  vi.spyOn(getPostRepository(), 'toggleLike').mockReturnValue(
    new Promise((_, reject) => {
      rejectLike = () => reject(new Error('denied'))
    })
  )
  fireEvent.click(button)
  expect(button.textContent).toBe('1')
  rejectLike()
  await waitFor(() => expect(button.textContent).toBe('0'))
})

it('downloads with an ASCII name', async () => {
  open(1, 'José Ávila')
  vi.stubGlobal('fetch', async () => new Response('media'))
  let fileName = ''
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    fileName = this.download
  })
  fireEvent.click(await screen.findByTitle('Baixar foto'))
  await waitFor(() => expect(fileName).toBe('casamento-thiago-e-priscila-jose-avila-p0.webp'))
})
