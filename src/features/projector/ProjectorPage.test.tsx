// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'

import { ProjectorPage } from '@/features/projector/ProjectorPage'
import { getPostRepository, getRealtimeService } from '@/services/repositories.factory'
import { setupBrowser } from '@/test/browser'

import type { Post } from '@/types/domain'

setupBrowser()
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const post = (id: string, values: Partial<Post> = {}): Post => ({
  id,
  authorName: `Author ${id}`,
  mediaUrl: `/media/${id}.webp`,
  caption: null,
  challengeId: null,
  likesCount: 0,
  isApproved: true,
  createdAt: `2026-01-01T12:0${9 - Number(id)}:00Z`,
  ...values,
})

// jsdom does not load images
class LoadedImage {
  onload = () => {}
  naturalWidth = 4
  naturalHeight = 3
  set src(_: string) {
    queueMicrotask(() => this.onload())
  }
}

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
// Role queries are slow in jsdom
const shown = () =>
  screen
    .queryAllByAltText(/^Foto por/)
    .at(-1)
    ?.getAttribute('alt')

async function open(posts: readonly Post[]) {
  vi.useFakeTimers()
  vi.stubGlobal('Image', LoadedImage)
  sessionStorage.setItem(
    'instawedding_mock_admin_user',
    JSON.stringify({ email: 'admin@x.test', name: 'Admin', role: 'admin' })
  )
  localStorage.setItem('instawedding_mock_posts', JSON.stringify(posts))
  let announce: (post: Post) => void = () => {}
  vi.spyOn(getRealtimeService(), 'subscribeToNewPosts').mockImplementation((callback) => {
    announce = callback
    return () => {}
  })
  render(
    <MemoryRouter>
      <ProjectorPage />
    </MemoryRouter>
  )
  await wait(10)
  return async (newPost: Post) => {
    act(() => announce(newPost))
    await wait(10)
  }
}

const posts = [post('1'), post('2', { likesCount: 9 }), post('3')]

it('advances, pauses and wraps around', async () => {
  await open(posts)
  expect(shown()).toBe('Foto por Author 1')
  await wait(8100)
  expect(shown()).toBe('Foto por Author 2')
  fireEvent.keyDown(window, { key: ' ' })
  await wait(20_000)
  expect(shown()).toBe('Foto por Author 2')
  fireEvent.keyDown(window, { key: 'ArrowRight' })
  await wait(10)
  fireEvent.keyDown(window, { key: 'ArrowRight' })
  await wait(10)
  expect(shown()).toBe('Foto por Author 1')
  fireEvent.keyDown(window, { key: 'ArrowLeft' })
  await wait(10)
  expect(shown()).toBe('Foto por Author 3')
})

it('filters and opens the clicked thumbnail', async () => {
  await open(posts)
  fireEvent.click(screen.getByText('Destaques', { selector: 'button, button *' }))
  await wait(10)
  expect(shown()).toBe('Foto por Author 2')
  fireEvent.click(screen.getByTitle('Post de Author 3'))
  await wait(10)
  expect(shown()).toBe('Foto por Author 3')
})

it('shows a new post at once and announces it for 6 seconds', async () => {
  const announce = await open(posts)
  await wait(8100)
  await announce(post('0'))
  expect(shown()).toBe('Foto por Author 0')
  screen.getByText('Novo post ao vivo')
  await wait(6100)
  expect(screen.queryByText('Novo post ao vivo')).toBeNull()
})

it('ignores a new post that opted out', async () => {
  const announce = await open(posts)
  await announce(post('0', { showOnProjector: false }))
  expect(shown()).toBe('Foto por Author 1')
  expect(screen.queryByText('Novo post ao vivo')).toBeNull()
})

it('skips broken media instead of stopping', async () => {
  await open(posts)
  vi.stubGlobal(
    'Image',
    class {
      onerror = () => {}
      set src(_: string) {
        queueMicrotask(() => this.onerror())
      }
    }
  )
  await wait(8100)
  expect(shown()).toBe('Foto por Author 2')
})

it.each([
  ['plays a 10 s video to the end', 10, 9900, 10_100],
  ['limits a longer video', 60, 10_700, 10_900],
  ['limits a video of unknown duration', Infinity, 10_700, 10_900],
  ['keeps a short video for a whole slide', 2, 7900, 8100],
])('%s', async (_, seconds, before, after) => {
  const media = HTMLMediaElement.prototype
  vi.spyOn(media, 'load').mockImplementation(() => {})
  vi.spyOn(media, 'duration', 'get').mockReturnValue(seconds)
  vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(4)
  vi.spyOn(media, 'src', 'set').mockImplementation(function (this: HTMLMediaElement) {
    queueMicrotask(() => this.onloadedmetadata?.(new Event('loadedmetadata')))
  })
  await open([post('1', { mediaUrl: '/media/1.mp4' }), post('2')])
  await wait(before - 10)
  expect(shown()).toBeUndefined()
  await wait(after - before)
  expect(shown()).toBe('Foto por Author 2')
})

it('empties the stage when every post is hidden', async () => {
  const announce = await open(posts)
  vi.spyOn(getPostRepository(), 'getPosts').mockResolvedValue([])
  await wait(30_000)
  screen.getByText('Aguardando o primeiro clique da noite!')
  await announce(post('0'))
  expect(shown()).toBe('Foto por Author 0')
})

it('keeps the posts when a refresh fails', async () => {
  await open(posts)
  vi.spyOn(getPostRepository(), 'getPosts').mockRejectedValue(new Error())
  await wait(30_100)
  expect(shown()).toMatch(/Foto por/)
})

it('leaves browser shortcuts and focused buttons alone', async () => {
  await open(posts)
  const requestFullscreen = vi.fn().mockResolvedValue(undefined)
  document.documentElement.requestFullscreen = requestFullscreen
  fireEvent.keyDown(window, { key: 'f', ctrlKey: true })
  expect(requestFullscreen).not.toHaveBeenCalled()
  fireEvent.keyDown(window, { key: 'f' })
  expect(requestFullscreen).toHaveBeenCalledOnce()
  // A prevented event returns false
  const button = screen.getByTitle(/Próximo post/)
  expect(fireEvent.keyUp(button, { key: ' ' })).toBe(false)
})
