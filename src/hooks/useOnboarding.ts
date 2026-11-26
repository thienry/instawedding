import { useEffect, useState } from 'react'

import { hasSeenOnboarding, markOnboardingSeen, onOnboardingRequest } from '@/utils/onboarding'

import type { OnboardingScreen } from '@/utils/onboarding'

/** Card of a screen, as returned by {@link useOnboarding}. */
export interface Onboarding {
  readonly isOpen: boolean
  /** Closes the card for good on this device. */
  readonly close: () => void
}

/**
 * Shows the card of the screen on the first visit, and whenever the guest asks
 * for it again.
 *
 * @param isBlocked - Waits while another dialog is open, so they do not stack.
 */
export function useOnboarding(screen: OnboardingScreen, isBlocked = false): Onboarding {
  const [isWanted, setIsWanted] = useState(() => !hasSeenOnboarding(screen))

  useEffect(() => onOnboardingRequest(screen, () => setIsWanted(true)), [screen])

  return {
    isOpen: isWanted && !isBlocked,
    close: () => {
      markOnboardingSeen(screen)
      setIsWanted(false)
    },
  }
}
