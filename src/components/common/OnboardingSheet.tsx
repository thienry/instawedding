import { useEffect, useRef } from 'react'

import { ONBOARDING_CONTENT } from '@/components/common/onboarding-content'

import type { Onboarding } from '@/hooks/useOnboarding'
import type { OnboardingScreen } from '@/utils/onboarding'

interface OnboardingSheetProps {
  readonly screen: OnboardingScreen
  readonly onboarding: Onboarding
}

/** Tips about the screen, from the bottom on phones and centered on computers. */
export function OnboardingSheet({ screen, onboarding }: OnboardingSheetProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { isOpen, close } = onboarding
  const { title, tips } = ONBOARDING_CONTENT[screen]
  const titleId = `onboarding-${screen}-title`

  useEffect(() => {
    if (isOpen) buttonRef.current?.focus()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') close()
      }}
      onClick={close}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 animate-in slide-in-from-bottom-8 duration-300">
        <h2 id={titleId} className="font-serif text-xl font-bold text-sage-900 leading-tight">
          {title}
        </h2>
        <ul className="space-y-3">
          {tips.map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-base text-sage-900">
              <span aria-hidden="true" className="text-2xl leading-none shrink-0">
                {icon}
              </span>
              <span className="leading-snug">{text}</span>
            </li>
          ))}
        </ul>
        <button
          ref={buttonRef}
          type="button"
          onClick={close}
          className="w-full min-h-13 rounded-2xl bg-sage-900 hover:bg-sage-800 text-white text-base font-bold transition-colors">
          Entendi
        </button>
      </div>
    </div>
  )
}
