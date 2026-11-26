import { CircleHelp } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { getOnboardingScreen, requestOnboarding } from '@/utils/onboarding'

interface HelpButtonProps {
  readonly className: string
  /** Shown next to the icon, when given. */
  readonly label?: string
}

/** Shows again the tips of the screen on display. Hidden on screens without them. */
export function HelpButton({ className, label }: HelpButtonProps) {
  const { pathname } = useLocation()
  const screen = getOnboardingScreen(pathname)
  if (!screen) return null

  return (
    <button
      type="button"
      onClick={() => requestOnboarding(screen)}
      title="Como usar esta tela"
      aria-label="Como usar esta tela"
      className={className}>
      <CircleHelp className="w-5 h-5 shrink-0" />
      {label && <span>{label}</span>}
    </button>
  )
}
