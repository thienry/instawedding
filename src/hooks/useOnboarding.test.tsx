// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it } from 'vitest'

import { HelpButton } from '@/components/common/HelpButton'
import { OnboardingSheet } from '@/components/common/OnboardingSheet'
import { useOnboarding } from '@/hooks/useOnboarding'
import { setupBrowser } from '@/test/browser'
import { hasSeenOnboarding, ONBOARDING_STORAGE_KEY } from '@/utils/onboarding'

setupBrowser()
beforeEach(() => localStorage.removeItem(ONBOARDING_STORAGE_KEY))

function Screen({ isBlocked = false }: { readonly isBlocked?: boolean }) {
  const onboarding = useOnboarding('challenges', isBlocked)
  return (
    <>
      <HelpButton className="" />
      <OnboardingSheet screen="challenges" onboarding={onboarding} />
    </>
  )
}

const open = (isBlocked = false) =>
  render(
    <MemoryRouter initialEntries={['/challenges']}>
      <Screen isBlocked={isBlocked} />
    </MemoryRouter>
  )

it('greets on the first visit only, and again on request', () => {
  const { unmount } = open()
  screen.getByRole('dialog', { name: /Desafios da festa/ })
  fireEvent.click(screen.getByRole('button', { name: 'Entendi' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(hasSeenOnboarding('challenges')).toBe(true)

  unmount()
  open()
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Como usar esta tela' }))
  screen.getByRole('dialog', { name: /Desafios da festa/ })
})

it('waits for other dialogs', () => {
  open(true)
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('has no help where there are no tips', () => {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <HelpButton className="" />
    </MemoryRouter>
  )
  expect(screen.queryByRole('button')).toBeNull()
})
