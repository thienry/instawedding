// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
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
  fireEvent.click(screen.getByRole('button', { name: /^Fotos/ }))
  fireEvent.click(screen.getByRole('button', { name: /^Desafios/ }))
  expect(screen.getByLabelText<HTMLInputElement>('Título do Desafio').value).toBe('Brinde')
})
