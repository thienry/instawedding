/** Screens that greet the guest with a card on the first visit. */
export type OnboardingScreen = 'feed' | 'capture' | 'challenges'

/** Screens already seen on this device, as a JSON array. */
export const ONBOARDING_STORAGE_KEY = 'instawedding_onboarding_seen'

/** Asks the screen on display to show its card again. */
const OPEN_EVENT = 'instawedding:onboarding-open'

const SCREEN_BY_PATH: Readonly<Record<string, OnboardingScreen>> = {
  '/': 'feed',
  '/capture': 'capture',
  '/challenges': 'challenges',
}

/** Screen of the path, or `null` when it has no card. */
export function getOnboardingScreen(pathname: string): OnboardingScreen | null {
  return SCREEN_BY_PATH[pathname] ?? null
}

function readSeen(): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function hasSeenOnboarding(screen: OnboardingScreen): boolean {
  return readSeen().includes(screen)
}

export function markOnboardingSeen(screen: OnboardingScreen): void {
  try {
    const seen = new Set(readSeen()).add(screen)
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify([...seen]))
  } catch {
    // Private mode: the card shows again next time
  }
}

/** Shows the card of the screen again, if it is on display. */
export function requestOnboarding(screen: OnboardingScreen): void {
  window.dispatchEvent(new CustomEvent<OnboardingScreen>(OPEN_EVENT, { detail: screen }))
}

/** Calls back when someone asks for the card of the screen. */
export function onOnboardingRequest(screen: OnboardingScreen, callback: () => void): () => void {
  const listener = (event: Event) => {
    if ((event as CustomEvent<OnboardingScreen>).detail === screen) callback()
  }
  window.addEventListener(OPEN_EVENT, listener)
  return () => window.removeEventListener(OPEN_EVENT, listener)
}
