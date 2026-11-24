// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'

import { CapturePage } from '@/features/capture/CapturePage'
import { getGuestAuthService } from '@/services/guest-auth.factory'
import { OfflineQueueService } from '@/services/offline-queue.service'
import { setupBrowser } from '@/test/browser'
import { compressPhoto } from '@/utils/compressor'
import { renderFilteredAndFramedPhoto } from '@/utils/photo-renderer'
import { validateVideoFile } from '@/utils/video'

vi.mock('@/utils/compressor', () => ({ compressPhoto: vi.fn() }))
vi.mock('@/utils/photo-renderer', () => ({
  renderFilteredAndFramedPhoto: vi.fn(),
}))
vi.mock('@/utils/video', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/video')>()),
  validateVideoFile: vi.fn(),
}))
vi.mock('@/components/capture/GuestbookModal', () => ({
  GuestbookModal: ({
    onSend,
  }: {
    onSend: (file: File, showOnProjector: boolean) => Promise<void>
  }) => <button onClick={() => void onSend(card, false)}>card</button>,
}))

setupBrowser()

const photo = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
const compressed = new File(['c'], 'a.webp', { type: 'image/webp' })
const card = new File(['g'], 'card.webp', { type: 'image/webp' })
const video = new File(['v'], 'a.mp4', { type: 'video/mp4' })

let submit = vi.spyOn(OfflineQueueService, 'submitInBackground')

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(compressPhoto).mockResolvedValue(compressed)
  vi.mocked(validateVideoFile).mockResolvedValue({
    valid: true,
    durationSeconds: 4,
  })
  submit = vi.spyOn(OfflineQueueService, 'submitInBackground').mockResolvedValue('task')
})

function open(path = '/capture', signedIn = true) {
  if (signedIn) {
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
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/capture" element={<CapturePage />} />
        <Route path="/" element={<output>feed</output>} />
      </Routes>
    </MemoryRouter>
  )
}

function select(file: File) {
  fireEvent.change(document.querySelectorAll('input[type=file]')[1]!, {
    target: { files: [file] },
  })
}

async function post() {
  const button = await waitFor(() => {
    const found = document.querySelector<HTMLButtonElement>(
      'form button[type=submit]:not(:disabled)'
    )
    if (!found) throw new Error('Submit button is not ready')
    return found
  })
  fireEvent.click(button)
}

it('posts the compressed photo with its details', async () => {
  open('/capture?challengeId=1')
  screen.getByText(/Você iniciou um desafio especial/)
  select(photo)
  await screen.findByAltText('Prévia da foto')
  await waitFor(() => expect(screen.getByRole<HTMLSelectElement>('combobox').value).toBe('1'))
  fireEvent.change(screen.getByPlaceholderText(/recado carinhoso/), {
    target: { value: '  Oi  ' },
  })
  fireEvent.click(screen.getByRole('checkbox'))
  await post()
  await screen.findByText('feed')
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({
      file: compressed,
      caption: 'Oi',
      challengeId: 1,
      challenge: expect.objectContaining({ id: 1 }),
      showOnProjector: false,
    })
  )
})

it('never posts the original when it cannot be processed', async () => {
  vi.mocked(compressPhoto).mockRejectedValue(new Error('unreadable'))
  open()
  select(photo)
  await screen.findByText(/Não foi possível ler esta foto/)
  expect(document.querySelector('form')).toBeNull()
  expect(submit).not.toHaveBeenCalled()
})

it('renders the chosen filter and frame into the photo', async () => {
  const rendered = new File(['r'], 'r.jpg')
  vi.mocked(renderFilteredAndFramedPhoto).mockResolvedValue(rendered)
  open()
  select(photo)
  await screen.findByAltText('Prévia da foto')
  fireEvent.click(screen.getByAltText('P&B Elegante'))
  fireEvent.click(screen.getByRole('button', { name: 'Molduras' }))
  fireEvent.click(screen.getByText('Polaroid Noivos'))
  await post()
  await screen.findByText('feed')
  expect(renderFilteredAndFramedPhoto).toHaveBeenCalledWith(
    'blob:test',
    'a.jpg',
    expect.objectContaining({ filterId: 'bw', frameId: 'polaroid' })
  )
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({ file: rendered }))
})

it('posts a video untouched, without photo effects', async () => {
  open()
  select(video)
  await screen.findByText('4.0s')
  expect(screen.queryByText('Filtros')).toBeNull()
  await post()
  await screen.findByText('feed')
  expect(compressPhoto).not.toHaveBeenCalled()
  expect(submit.mock.calls[0]![0].file.name).toBe('a.mp4')
})

it('rejects invalid videos and files over 25 MB', async () => {
  vi.mocked(validateVideoFile).mockResolvedValue({
    valid: false,
    durationSeconds: 60,
    errorMessage: 'Vídeo longo',
  })
  open()
  select(video)
  await screen.findByText('Vídeo longo')
  const big = new File(['x'], 'b.jpg', { type: 'image/jpeg' })
  Object.defineProperty(big, 'size', { value: 26 * 1024 * 1024 })
  select(big)
  await screen.findByText(/tem 26.0MB e excede/)
  expect(document.querySelector('form')).toBeNull()
})

it('sends a guestbook card without the photo studio', async () => {
  open('/capture?challengeId=1')
  fireEvent.click(screen.getByText('card'))
  await screen.findByText('feed')
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({
      file: card,
      caption: '💌 Recado para os noivos',
      challengeId: null,
      clientSessionId: 'g1',
      showOnProjector: false,
    })
  )
})

it('keeps the form and reports a failed submission', async () => {
  submit.mockRejectedValue(new Error('Sem espaço'))
  open()
  select(photo)
  await post()
  await screen.findByText('Sem espaço')
  await post()
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
})

it('goes back to the choices and resets the projector option', async () => {
  open()
  select(photo)
  await screen.findByAltText('Prévia da foto')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByText('Trocar mídia'))
  screen.getByText('Registre o Momento')
  select(photo)
  await screen.findByAltText('Prévia da foto')
  expect(screen.getByRole<HTMLInputElement>('checkbox').checked).toBe(true)
})

it('keeps the challenge through the login and reports its failure', async () => {
  const signIn = vi
    .spyOn(getGuestAuthService(), 'signInWithGoogle')
    .mockResolvedValue({ success: false, message: 'Negado' })
  open('/capture?challengeId=2', false)
  fireEvent.click(screen.getByText('Continuar com Google'))
  await screen.findByText('Negado')
  expect(signIn).toHaveBeenCalledWith('/capture?challengeId=2')
  signIn.mockRejectedValue(new Error('offline'))
  fireEvent.click(screen.getByText('Continuar com Google'))
  await screen.findByText(/Não foi possível iniciar o login/)
})

it('asks for login again after signing out', async () => {
  open()
  fireEvent.click(screen.getByText('Sair'))
  await screen.findByText('Continuar com Google')
})

it('ignores the compression of a photo that was replaced', async () => {
  let finishFirst = (_file: File) => {}
  let finishSecond = (_file: File) => {}
  vi.mocked(compressPhoto)
    .mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)))
    .mockReturnValueOnce(new Promise((resolve) => (finishSecond = resolve)))
  open()
  select(photo)
  fireEvent.click(await screen.findByText('Trocar mídia'))
  select(new File(['y'], 'b.jpg', { type: 'image/jpeg' }))
  await act(async () => finishFirst(new File(['1'], 'first.webp')))
  screen.getByText('Processando mídia...')
  await act(async () => finishSecond(compressed))
  await post()
  await screen.findByText('feed')
  expect(submit.mock.calls[0]![0].file).toBe(compressed)
})

it('keeps the caption when the media is replaced', async () => {
  open()
  select(photo)
  await screen.findByAltText('Prévia da foto')
  const caption = () => screen.getByPlaceholderText<HTMLTextAreaElement>(/recado carinhoso/)
  fireEvent.change(caption(), { target: { value: 'Oi' } })
  fireEvent.click(screen.getByText('Trocar mídia'))
  select(photo)
  await screen.findByAltText('Prévia da foto')
  expect(caption().value).toBe('Oi')
})

it('hides the post action from a guest who signs out', async () => {
  open()
  select(photo)
  await screen.findByAltText('Prévia da foto')
  fireEvent.click(screen.getByText('Trocar conta'))
  await screen.findByText('Continuar com Google')
  expect(screen.queryByText('Postar Foto')).toBeNull()
  screen.getByText('Voltar ao feed')
})
