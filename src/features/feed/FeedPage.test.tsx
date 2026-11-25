// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { expect, it, vi } from 'vitest'

import { FeedPage } from '@/features/feed/FeedPage'
import { OfflineQueueService } from '@/services/offline-queue.service'
import { getPostRepository } from '@/services/repositories.factory'
import { setupBrowser } from '@/test/browser'

import type { Post } from '@/types/domain'

setupBrowser()

const newPost: Post = {
  id: 'new',
  authorName: 'Ana',
  mediaUrl: '/media/n.webp',
  caption: null,
  challengeId: null,
  likesCount: 0,
  isApproved: true,
  createdAt: '2026-01-01T13:00:00Z',
}

function BackButton() {
  const navigate = useNavigate()
  return <button onClick={() => void navigate(-1)}>back</button>
}

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
      <BackButton />
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
  const { container } = open(30)
  // Role queries are slow in jsdom
  const countPosts = () => container.querySelectorAll('article').length
  await waitFor(() => expect(countPosts()).toBe(12))
  await screen.findByText('Carregando mais posts...')
  act(() => reachEnd())
  expect(countPosts()).toBe(22)
  fireEvent.click(screen.getByRole('button', { name: 'Mais Curtidos' }))
  expect(countPosts()).toBe(12)
})

it('likes on double tap', async () => {
  const { container } = open(1)
  await screen.findByTitle('Curtir post')
  const media = container.querySelector('article .cursor-pointer')!
  fireEvent.click(media)
  expect(screen.getByTitle('Curtir post').textContent).toBe('0')
  fireEvent.click(media)
  await waitFor(() => expect(screen.getByTitle('Curtir post').textContent).toBe('1'))
})

it('refreshes only when pulled past the threshold', async () => {
  const { container } = open(1)
  await screen.findByTitle('Curtir post')
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
  const button = await screen.findByTitle('Curtir post')
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
  fireEvent.click(await screen.findByTitle('Baixar mídia'))
  await waitFor(() => expect(fileName).toBe('casamento-thiago-e-priscila-jose-avila-p0.webp'))
})

it('reports a failed load and recovers when the network returns', async () => {
  const getPosts = vi.spyOn(getPostRepository(), 'getPosts').mockRejectedValue(new Error('offline'))
  open(1)
  await screen.findByText('Não foi possível carregar os posts')
  expect(screen.queryByText('Nenhum post ainda')).toBeNull()
  getPosts.mockRestore()
  fireEvent(window, new Event('online'))
  await screen.findByTitle('Curtir post')
})

it('keeps a post published while the feed was loading', async () => {
  let load = (_posts: Post[]) => {}
  vi.spyOn(getPostRepository(), 'getPosts').mockReturnValue(
    new Promise((resolve) => (load = resolve))
  )
  let publish = (_post: Post, _taskId: string) => {}
  vi.spyOn(OfflineQueueService, 'onPostPublished').mockImplementation((listener) => {
    publish = listener
    return () => {}
  })
  const { container } = open(0)
  act(() => publish(newPost, 't'))
  await act(async () => load([]))
  expect(container.querySelectorAll('article')).toHaveLength(1)
})

it('does not open the photo again when going back', async () => {
  const { container } = open(1)
  fireEvent.click(await screen.findByLabelText('Ver em tela cheia'))
  const getPosts = vi.spyOn(getPostRepository(), 'getPosts')
  const dialog = screen.getByRole('dialog')
  fireEvent.touchStart(dialog, { touches: [{ clientY: 0 }] })
  fireEvent.touchMove(dialog, { touches: [{ clientY: 300 }] })
  fireEvent.touchEnd(dialog)
  expect(getPosts).not.toHaveBeenCalled()

  fireEvent.click(screen.getByLabelText('Fechar visualização'))
  fireEvent.click(screen.getByText('back'))
  expect(container.querySelector('[role=dialog]')).toBeNull()
})
