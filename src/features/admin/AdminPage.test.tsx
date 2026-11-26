// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'

import { AdminPage } from '@/features/admin/AdminPage'
import { MOCK_ADMIN_EMAIL } from '@/services/mock/mock-admin-auth.service'
import { setupBrowser } from '@/test/browser'

setupBrowser()

const open = () =>
  render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>
  )

async function requestCode(email: string) {
  fireEvent.change(await screen.findByLabelText('E-mail'), {
    target: { value: email },
  })
  fireEvent.click(screen.getByRole('button', { name: /^Receber código/ }))
}

async function submitCode(code: string) {
  fireEvent.change(await screen.findByLabelText('Código de acesso'), {
    target: { value: code },
  })
  fireEvent.click(screen.getByRole('button', { name: /^Confirmar/ }))
}

it('rejects an unknown email', async () => {
  open()
  await requestCode('nobody@x.test')
  await screen.findByText(/não possui permissão/)
})

it('rejects a wrong code, then signs in and out', async () => {
  open()
  await requestCode(MOCK_ADMIN_EMAIL.toUpperCase())
  await submitCode('999999')
  await screen.findByText(/Código incorreto/)
  await submitCode('123 456')
  await screen.findByRole('button', { name: /^Cerimonial/ })
  sessionStorage.setItem('leftover', '1')
  fireEvent.click(screen.getByRole('button', { name: 'Sair da Conta' }))
  const email = await screen.findByLabelText<HTMLInputElement>('E-mail')
  expect(email.value).toBe('')
  expect(sessionStorage.length).toBe(0)
})

it('hides ceremonialists and destructive actions from moderators', async () => {
  open()
  fireEvent.click(await screen.findByRole('button', { name: /^Equipe/ }))
  await submitCode('123456')
  await screen.findByRole('button', { name: /^Desafios/ })
  expect(screen.queryByRole('button', { name: /^Cerimonial/ })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Zerar Feed' })).toBeNull()
  expect(screen.queryByTitle(/^Excluir/)).toBeNull()
})

it('keeps the challenge draft when switching tabs', async () => {
  open()
  fireEvent.click(await screen.findByRole('button', { name: /^Thiago/ }))
  await submitCode('123456')
  fireEvent.click(await screen.findByRole('button', { name: /^Desafios/ }))
  fireEvent.change(screen.getByLabelText('Título do Desafio'), {
    target: { value: 'Brinde' },
  })
  fireEvent.click(screen.getByRole('button', { name: /^Posts/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Desafios/ }))
  expect(screen.getByLabelText<HTMLInputElement>('Título do Desafio').value).toBe('Brinde')
})

it('counts down to a moment, then starts it early', async () => {
  open()
  fireEvent.click(await screen.findByRole('button', { name: /^Equipe/ }))
  await submitCode('123456')
  fireEvent.click(await screen.findByRole('button', { name: /^Desafios/ }))
  const card = () => screen.getByText('Buquê').closest('div.rounded-3xl') as HTMLElement
  fireEvent.click(within(await waitFor(card)).getByRole('button', { name: 'Em 5 min' }))
  await within(card()).findByText(/Começa em [45]:\d\d/)

  fireEvent.click(within(card()).getByRole('button', { name: 'Começar agora' }))
  await within(card()).findByText('No ar há 0 min')
  fireEvent.click(within(card()).getByRole('button', { name: 'Encerrar' }))
  await within(card()).findByRole('button', { name: 'Em 2 min' })
})

it('bans terms and takes posts off the projector, keeping them in the feed', async () => {
  localStorage.setItem(
    'instawedding_mock_posts',
    JSON.stringify([
      {
        id: 'p1',
        authorName: 'Bia',
        mediaUrl: '/media/a.webp',
        caption: 'Que bosta de música',
        challengeId: null,
        likesCount: 0,
        isApproved: true,
        createdAt: '2026-12-12T22:00:00Z',
      },
    ])
  )
  open()
  fireEvent.click(await screen.findByRole('button', { name: /^Equipe/ }))
  await submitCode('123456')
  await screen.findByText('Que bosta de música')
  expect(screen.queryByText('Fora do telão')).toBeNull()

  fireEvent.change(screen.getByLabelText('Novo termo'), { target: { value: 'Bosta' } })
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
  await screen.findByText(/Termo banido: “bosta”/)
  screen.getByRole('button', { name: 'Fora do telão (1)' })
  screen.getByText('Visível')

  fireEvent.click(screen.getByRole('button', { name: 'Remover bosta' }))
  await waitFor(() => expect(screen.queryByText(/Termo banido/)).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: 'Tirar do telão' }))
  await screen.findByText(/Tirado do telão pela moderação/)
  fireEvent.click(screen.getByRole('button', { name: 'Voltar ao telão' }))
  await waitFor(() => expect(screen.queryByText('Fora do telão')).toBeNull())
})
