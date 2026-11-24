// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import { GuestbookModal } from '@/components/capture/GuestbookModal'
import { setupBrowser } from '@/test/browser'
import { generateGuestbookCardFile } from '@/utils/guestbook-card'

vi.mock('@/components/capture/GuestbookPreview', () => ({ GuestbookPreview: () => null }))
vi.mock('@/utils/guestbook-card', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/guestbook-card')>()),
  generateGuestbookCardFile: vi.fn(),
}))

setupBrowser()

const card = new File(['c'], 'c.webp')
const onSend = vi.fn()
const onClose = vi.fn()
const message = () => screen.getByLabelText<HTMLTextAreaElement>('Mensagem')
const type = (value: string) => fireEvent.change(message(), { target: { value } })
const clickSend = () => fireEvent.click(screen.getByRole('button', { name: 'Enviar recado' }))

beforeEach(() => {
  onSend.mockReset().mockResolvedValue(undefined)
  onClose.mockReset()
  vi.mocked(generateGuestbookCardFile).mockReset().mockResolvedValue(card)
  render(<GuestbookModal isOpen authorName="Ana" onClose={onClose} onSend={onSend} />)
})

it('sends the card with the chosen paper', async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Noite estrelada' }))
  type('  Felicidades sempre!  ')
  fireEvent.click(screen.getByRole('checkbox'))
  clickSend()
  await waitFor(() => expect(onSend).toHaveBeenCalledWith(card, false))
  expect(generateGuestbookCardFile).toHaveBeenCalledWith({
    theme: expect.objectContaining({ id: 'night' }),
    message: 'Felicidades sempre!',
    authorName: 'Ana',
  })
})

it('asks for a longer message', () => {
  type('Oi')
  clickSend()
  screen.getByText(/um pouquinho maior/)
  expect(onSend).not.toHaveBeenCalled()
})

it('keeps the message when sending fails', async () => {
  onSend.mockRejectedValue(new Error('x'))
  type('Felicidades sempre!')
  clickSend()
  await screen.findByText(/Não foi possível enviar/)
  expect(message().value).toBe('Felicidades sempre!')
})

it('only replaces a typed message after confirmation', async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Amor' }))
  await waitFor(() => expect(message().value).toContain('amor'))
  fireEvent.click(screen.getByRole('button', { name: 'Bênção' }))
  await waitFor(() => expect(message().value).toContain('Deus'))
  type('Escrevi este recado')
  fireEvent.click(screen.getByRole('button', { name: 'Amor' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Manter a minha' }))
  expect(message().value).toBe('Escrevi este recado')
})

it('confirms before discarding a typed message', async () => {
  type('Escrevi este recado')
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Continuar escrevendo' }))
  expect(onClose).not.toHaveBeenCalled()
  type('')
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
  await waitFor(() => expect(onClose).toHaveBeenCalled())
})
