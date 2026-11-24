// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'

import { AppLayout } from '@/components/layout/AppLayout'
import { FeedNotificationService } from '@/services/feed-notification.service'
import { OfflineQueueService } from '@/services/offline-queue.service'
import { setupBrowser } from '@/test/browser'

import type { UserRole } from '@/services/contracts/admin-auth.contract'

setupBrowser()

let flush = vi.spyOn(OfflineQueueService, 'flush')
let online = true
let unread = 0

beforeEach(() => {
  online = true
  unread = 0
  flush = vi.spyOn(OfflineQueueService, 'flush').mockResolvedValue(0)
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
  const state = FeedNotificationService.getState()
  const getState = () => ({ ...state, totalUnreadCount: unread })
  vi.spyOn(FeedNotificationService, 'getState').mockImplementation(getState)
  vi.spyOn(FeedNotificationService, 'subscribe').mockReturnValue(() => {})
})

async function open(path = '/', role?: UserRole) {
  if (role) {
    sessionStorage.setItem(
      'instawedding_mock_admin_user',
      JSON.stringify({ email: 'admin@x.test', name: 'Admin', role })
    )
  }
  const { container } = render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<p>feed page</p>} />
          <Route path="*" element={<p>other page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
  await act(async () => {})
  return {
    sidebar: within(container.querySelector('aside')!),
    header: within(container.querySelector('header')!),
  }
}

it('shows the page, without the projector, to guests', async () => {
  const { sidebar, header } = await open()
  screen.getByText('feed page')
  sidebar.getByTitle('Painel de Moderação')
  header.getByTitle('Painel de Moderação')
  expect(screen.queryByTitle(/Modo Telão/)).toBeNull()
})

it.each(['admin', 'moderator'] as const)('gives the projector to the %s', async (role) => {
  const { sidebar, header } = await open('/', role)
  const label = role === 'admin' ? '👑 Admin' : '🛡️ Mod'
  sidebar.getByText(label)
  header.getByText(label)
  sidebar.getByTitle('Modo Telão')
  header.getByTitle('Abrir Modo Telão')
  sidebar.getByText('admin@x.test')
})

it.each(['expanded sidebar', 'collapsed sidebar', 'mobile header'])(
  'signs out from the %s and returns to the feed',
  async (place) => {
    if (place === 'collapsed sidebar') {
      localStorage.setItem('instawedding_sidebar_collapsed', 'true')
    }
    const { sidebar, header } = await open('/admin', 'admin')
    screen.getByText('other page')
    const button =
      place === 'mobile header'
        ? header.getByTitle('Encerrar sessão administrativa')
        : place === 'collapsed sidebar'
          ? sidebar.getByTitle('Sair da sessão administrativa')
          : sidebar.getByText('Sair')
    await act(async () => fireEvent.click(button))
    screen.getByText('feed page')
    sidebar.getByTitle('Painel de Moderação')
    expect(sessionStorage.length).toBe(0)
  }
)

it.each([undefined, 'admin'] as const)(
  'remembers the collapsed sidebar (role: %s)',
  async (role) => {
    const { sidebar } = await open('/', role)
    fireEvent.click(sidebar.getByLabelText('Recolher menu lateral'))
    expect(localStorage.getItem('instawedding_sidebar_collapsed')).toBe('true')
    fireEvent.click(sidebar.getByLabelText('Expandir menu lateral'))
    expect(localStorage.getItem('instawedding_sidebar_collapsed')).toBe('false')
  }
)

it('shows unread posts in the title and in both sidebar states', async () => {
  unread = 120
  const { sidebar } = await open('/challenges')
  expect(document.title).toBe('(120) Desafios da Festa | Casamento de Thiago & Priscila')
  sidebar.getByText('99+')
  fireEvent.click(sidebar.getByLabelText('Recolher menu lateral'))
  sidebar.getByText('9+')
  expect(sidebar.queryByText('99+')).toBeNull()
})

it('warns when offline and sends the queue when back online', async () => {
  online = false
  await open()
  screen.getByText(/Você está offline/)
  expect(flush).not.toHaveBeenCalled()
  online = true
  act(() => void window.dispatchEvent(new Event('online')))
  expect(screen.queryByText(/Você está offline/)).toBeNull()
  expect(flush).toHaveBeenCalledOnce()
})
