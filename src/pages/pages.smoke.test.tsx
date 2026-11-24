// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { expect, it, vi } from 'vitest'

import { AdminPage } from '@/pages/AdminPage'
import { CapturePage } from '@/pages/CapturePage'
import { ChallengesPage } from '@/pages/ChallengesPage'
import { FeedPage } from '@/pages/FeedPage'
import { ProjectorPage } from '@/pages/ProjectorPage'
import { OfflineQueueService } from '@/services/offline-queue.service'
import { getPostRepository } from '@/services/repositories.factory'
import { setupBrowser } from '@/test/browser'

import type { Post } from '@/types/domain'
import type { ReactElement } from 'react'

vi.mock('@/utils/compressor', () => ({
  compressPhoto: async (file: File) => file,
}))

setupBrowser()

const SEED_AUTHOR = 'Camila & Família'

function Location() {
  const { pathname, search } = useLocation()
  return <output>{`${pathname}${search}`}</output>
}

function open(page: ReactElement, post: Partial<Post> = {}) {
  // The repository singleton outlives the cleared storage, so reseed it.
  localStorage.setItem(
    'instawedding_mock_posts',
    JSON.stringify([
      {
        id: 'p1',
        authorName: SEED_AUTHOR,
        mediaUrl: 'https://x.test/a.webp',
        caption: 'Brinde',
        challengeId: 1,
        likesCount: 5,
        isApproved: true,
        createdAt: '2026-01-01T12:00:00Z',
        ...post,
      },
    ])
  )
  return render(
    <MemoryRouter initialEntries={['/page']}>
      <Routes>
        <Route path="/page" element={page} />
        <Route path="*" element={<Location />} />
      </Routes>
    </MemoryRouter>
  )
}

function signInGuest() {
  localStorage.setItem(
    'instawedding_mock_guest_user',
    JSON.stringify({
      id: 'g1',
      name: 'Ana',
      email: 'a@x.test',
      avatarUrl: null,
    })
  )
}

function signInAdmin() {
  sessionStorage.setItem(
    'instawedding_mock_admin_user',
    JSON.stringify({ email: 'admin@x.test', name: 'Admin', role: 'admin' })
  )
}

it('feed: likes a photo', async () => {
  signInGuest()
  open(<FeedPage />)
  fireEvent.click(await screen.findByTitle('Curtir foto'))
  await waitFor(async () =>
    expect(await getPostRepository().hasUserLiked('p1', 'g1')).toBe(true)
  )
  await waitFor(() =>
    expect(screen.getByTitle('Curtir foto').textContent).toBe('6')
  )
})

it('feed: asks a signed-out guest to log in before liking', async () => {
  open(<FeedPage />)
  fireEvent.click(await screen.findByTitle('Entre com Google para curtir'))
  await screen.findByText(/Conecte sua conta Google para curtir/)
  expect(await getPostRepository().hasUserLiked('p1', 'g1')).toBe(false)
})

it('capture: posts the selected photo and returns to the feed', async () => {
  signInGuest()
  const submit = vi
    .spyOn(OfflineQueueService, 'submitInBackground')
    .mockResolvedValue('task')
  const { container } = open(<CapturePage />)
  const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
  fireEvent.change(container.querySelector('input[type=file]')!, {
    target: { files: [file] },
  })
  const button = await waitFor(() => {
    const found = container.querySelector<HTMLButtonElement>(
      'form button[type=submit]:not(:disabled)'
    )
    if (!found) throw new Error('Submit button is not ready')
    return found
  })
  fireEvent.click(button)
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('/'))
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({ file, authorName: 'Ana', clientSessionId: 'g1' })
  )
})

it('capture: requires login', async () => {
  open(<CapturePage />)
  await screen.findByRole('button', { name: 'Continuar com Google' })
})

it('challenges: starts a challenge', async () => {
  open(<ChallengesPage />)
  const [first] = await screen.findAllByTitle('Cumprir Desafio')
  fireEvent.click(first!)
  expect(screen.getByRole('status').textContent).toBe('/capture?challengeId=1')
})

it('projector: blocks visitors', async () => {
  open(<ProjectorPage />)
  await screen.findByText('Modo Telão Bloqueado')
})

it('projector: shows photos and the QR Code to admins', async () => {
  signInAdmin()
  open(<ProjectorPage />)
  expect((await screen.findAllByText(SEED_AUTHOR)).length).toBeGreaterThan(0)
  fireEvent.click(screen.getByTitle(/Ampliar QR Code/))
  await screen.findByLabelText('Fechar QR Code')
})

it('admin: requires login', async () => {
  open(<AdminPage />)
  await screen.findByRole('button', { name: 'Receber código por e-mail' })
})

it('admin: hides a photo', async () => {
  signInAdmin()
  open(<AdminPage />)
  fireEvent.click(await screen.findByTitle('Ocultar do Telão'))
  await screen.findByTitle('Aprovar no Telão')
  expect(await getPostRepository().getPosts()).toEqual([])
})

it.each([
  ['togglePostApproval', 'Ocultar do Telão', /Não foi possível alterar/],
  ['deletePostAsAdmin', /^Excluir Definitivamente/, /Não foi possível excluir/],
  ['clearAllPosts', /Zerar/, /Não foi possível zerar/],
] as const)(
  'admin: reports a %s failure and keeps the photo',
  async (method, control, message) => {
    signInAdmin()
    vi.spyOn(getPostRepository(), method).mockRejectedValue(new Error('denied'))
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'prompt').mockReturnValue('ZERAR')
    open(<AdminPage />)
    await screen.findByTitle('Ocultar do Telão')
    fireEvent.click(
      screen.queryByTitle(control) ??
        screen.getByRole('button', { name: control })
    )
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(expect.stringMatching(message))
    )
    expect(screen.getByTitle('Ocultar do Telão')).toBeTruthy()
  }
)

it('feed: reports a failed deletion and keeps the photo', async () => {
  signInGuest()
  vi.spyOn(getPostRepository(), 'deletePost').mockRejectedValue(
    new Error('denied')
  )
  const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
  open(<FeedPage />, { clientSessionId: 'g1' })
  fireEvent.click(await screen.findByTitle(/Excluir/))
  fireEvent.click(await screen.findByRole('button', { name: 'Excluir Foto' }))
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      expect.stringMatching(/Não foi possível excluir/)
    )
  )
  expect(screen.getAllByText(SEED_AUTHOR).length).toBeGreaterThan(0)
})
