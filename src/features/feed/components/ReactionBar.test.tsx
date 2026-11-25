// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { ReactionBar } from '@/features/feed/components/ReactionBar'
import { getReactionService } from '@/services/reaction.factory'
import { setupBrowser } from '@/test/browser'

setupBrowser()
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const guestUser = { id: 'g1', name: 'Ana', email: 'a@x.test', avatarUrl: null }
const tap = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }))
const wait = () => act(() => vi.advanceTimersByTimeAsync(1000))

function open() {
  const send = vi.spyOn(getReactionService(), 'send').mockResolvedValue()
  const view = render(<ReactionBar guest={{ guestUser, openAuthPrompt: vi.fn() }} />)
  tap('Reagir no telão')
  return { send, view }
}

it('asks a signed-out guest to log in', () => {
  const openAuthPrompt = vi.fn()
  render(<ReactionBar guest={{ guestUser: null, openAuthPrompt }} />)
  tap('Reagir no telão')
  expect(openAuthPrompt).toHaveBeenCalledOnce()
  expect(screen.queryByRole('button', { name: 'Amei' })).toBeNull()
})

it('sends quick taps in one message, with a limit', async () => {
  const { send, view } = open()
  for (let i = 0; i < 9; i++) tap('Amei')
  expect(view.container.querySelectorAll('[data-emoji]')).toHaveLength(5)
  await wait()
  expect(send.mock.calls).toEqual([[Array(5).fill('❤️')]])
  tap('Palmas')
  await wait()
  expect(send).toHaveBeenLastCalledWith(['👏'])
})

it('sends what is pending when leaving the page', () => {
  const { send, view } = open()
  tap('Brinde')
  view.unmount()
  expect(send).toHaveBeenCalledWith(['🥂'])
})

it('tells when a reaction is lost and recovers', async () => {
  const { send } = open()
  send.mockRejectedValueOnce(new Error('offline'))
  tap('Amei')
  await wait()
  screen.getByRole('alert')
  tap('Amei')
  await wait()
  expect(screen.queryByRole('alert')).toBeNull()
})
