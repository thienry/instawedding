import { useEffect, useState } from 'react'

import { QrCodeSvg } from '@/components/common/QrCodeSvg'
import { CAPTURE_URL } from '@/features/projector/constants'

import type { Challenge } from '@/types/domain'

const INTRO_MS = 10_000

interface MomentIntroProps {
  readonly moment: Challenge
}

/**
 * Announces, over everything, the moment that has just gone on air. Mount it
 * with a key per moment so each one is announced once.
 */
export function MomentIntro({ moment }: MomentIntroProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsVisible(false), INTRO_MS)
    return () => window.clearTimeout(timeoutId)
  }, [])

  if (!isVisible) return null

  return (
    <div
      role="dialog"
      aria-labelledby="moment-intro-title"
      onClick={() => setIsVisible(false)}
      className="projector-modal">
      <div className="projector-rise flex flex-col items-center text-center gap-[3vh]">
        <p className="uppercase tracking-[0.3em] text-[clamp(0.9rem,2.4vh,1.6rem)] text-gold-400">
          Agora
        </p>
        <h2
          id="moment-intro-title"
          className="font-serif text-[clamp(2.5rem,10vh,7.5rem)] leading-none text-balance">
          {moment.title} <span aria-hidden="true">{moment.icon}</span>
        </h2>
        <p className="font-serif italic text-[clamp(1.2rem,3.6vh,2.5rem)] text-white/75 text-balance">
          {moment.description}
        </p>
        <div className="p-3 bg-white rounded-2xl">
          <QrCodeSvg value={CAPTURE_URL} className="w-[clamp(10rem,30vh,22rem)] h-auto" />
        </div>
      </div>
    </div>
  )
}
