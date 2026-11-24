// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { expect, it, vi } from 'vitest'

import { AdminPage } from '@/features/admin/AdminPage'
import { CapturePage } from '@/features/capture/CapturePage'
import { ChallengesPage } from '@/features/challenges/ChallengesPage'
import { FeedPage } from '@/features/feed/FeedPage'
import { ProjectorPage } from '@/features/projector/ProjectorPage'
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
  await waitFor(async () => expect(await getPostRepository().hasUserLiked('p1', 'g1')).toBe(true))
  await waitFor(() => expect(screen.getByTitle('Curtir foto').textContent).toBe('6'))
})

it('feed: asks a signed-out guest to log in before liking', async () => {
  open(<FeedPage />)
  fireEvent.click(await screen.findByTitle('Entre com Google para curtir'))
  await screen.findByText(/Conecte sua conta Google para curtir/)
  expect(await getPostRepository().hasUserLiked('p1', 'g1')).toBe(false)
})

it('capture: posts the selected photo and returns to the feed', async () => {
  signInGuest()
  const submit = vi.spyOn(OfflineQueueService, 'submitInBackground').mockResolvedValue('task')
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
  ['togglePostApproval', 'Ocultar do Telão', null, /Não foi possível alterar/],
  ['deletePostAsAdmin', /^Excluir Definitivamente/, 'Excluir Foto', /Não foi possível excluir/],
  ['clearAllPosts', /apaga todos/, 'Zerar Feed', /Não foi possível zerar/],
] as const)(
  'admin: reports a %s failure and keeps the photo',
  async (method, control, confirmLabel, message) => {
    signInAdmin()
    const action = vi.spyOn(getPostRepository(), method).mockRejectedValue(new Error('denied'))
    open(<AdminPage />)
    fireEvent.click(await screen.findByTitle(control))
    if (confirmLabel) {
      const dialog = within(await screen.findByRole('alertdialog'))
      expect(action).not.toHaveBeenCalled()
      const field = dialog.queryByRole('textbox')
      if (field) fireEvent.change(field, { target: { value: 'ZERAR' } })
      fireEvent.click(dialog.getByRole('button', { name: confirmLabel }))
    }
    const notice = within(await screen.findByRole('dialog'))
    notice.getByText(message)
    fireEvent.click(notice.getByRole('button', { name: 'Entendi' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByTitle('Ocultar do Telão')).toBeTruthy()
  }
)

it('admin: does nothing when a deletion is cancelled', async () => {
  signInAdmin()
  const action = vi.spyOn(getPostRepository(), 'deletePostAsAdmin')
  open(<AdminPage />)
  const trigger = await screen.findByTitle(/^Excluir Definitivamente/)
  for (const cancel of [
    () => fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })),
    () => fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' }),
  ]) {
    fireEvent.click(trigger)
    await screen.findByRole('alertdialog')
    cancel()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  }
  expect(action).not.toHaveBeenCalled()
})

it('admin: only clears the feed after the exact word is typed', async () => {
  signInAdmin()
  const action = vi.spyOn(getPostRepository(), 'clearAllPosts')
  open(<AdminPage />)
  fireEvent.click(await screen.findByTitle(/apaga todos/))
  const dialog = within(await screen.findByRole('alertdialog'))
  const submit = dialog.getByRole('button', { name: 'Zerar Feed' })
  fireEvent.click(submit)
  fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'zerar' } })
  fireEvent.submit(submit.closest('form')!)
  expect(action).not.toHaveBeenCalled()
  fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'ZERAR' } })
  fireEvent.click(submit)
  await waitFor(() => expect(action).toHaveBeenCalledOnce())
})

it('feed: reports a failed deletion and keeps the photo', async () => {
  signInGuest()
  vi.spyOn(getPostRepository(), 'deletePost').mockRejectedValue(new Error('denied'))
  open(<FeedPage />, { clientSessionId: 'g1' })
  fireEvent.click(await screen.findByTitle(/Excluir/))
  fireEvent.click(await screen.findByRole('button', { name: 'Excluir Foto' }))
  await screen.findByText(/Não foi possível excluir/)
  expect(screen.getAllByText(SEED_AUTHOR).length).toBeGreaterThan(0)
})
