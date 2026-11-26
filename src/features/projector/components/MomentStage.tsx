import { QrCodeSvg } from '@/components/common/QrCodeSvg'
import { CAPTURE_URL } from '@/features/projector/constants'
import { SPARKS } from '@/features/projector/utils/sparks'

import type { Challenge } from '@/types/domain'
import type { CSSProperties } from 'react'

interface MomentStageProps {
  readonly moment: Challenge
  /** Whether a post of the moment has arrived yet. */
  readonly hasPosts: boolean
}

/**
 * Opens the moment that has just gone on air, and holds the stage until its
 * first post. Mount it with a key per moment so each one is celebrated.
 */
export function MomentStage({ moment, hasPosts }: MomentStageProps) {
  const words = moment.title.split(/\s+/)

  return (
    <main className="relative h-full flex flex-col items-center justify-center text-center p-6 gap-[3.5vh]">
      <p className="projector-rise flex items-center gap-[2vh] uppercase tracking-[0.35em] text-[clamp(0.9rem,2.4vh,1.6rem)] text-gold-400">
        <span className="h-px w-[7vh] bg-gold-400/60" />
        Agora
        <span className="h-px w-[7vh] bg-gold-400/60" />
      </p>

      <div className="relative">
        <span
          aria-hidden="true"
          className="projector-rise block text-[clamp(4rem,15vh,10rem)] leading-none">
          {moment.icon}
        </span>
        {SPARKS.map((style, index) => (
          <span key={index} aria-hidden="true" style={style} className="projector-spark" />
        ))}
      </div>

      <h1 className="font-serif italic text-[clamp(2.75rem,11vh,8rem)] leading-none tracking-tight text-balance">
        {words.map((word, index) => (
          <span key={index}>
            <span style={{ '--order': index * 2 } as CSSProperties} className="projector-word">
              {word}
            </span>{' '}
          </span>
        ))}
      </h1>

      <div className="projector-rise mt-[2vh] flex items-center gap-[3vh] text-left">
        <div className="p-2.5 bg-white rounded-xl shrink-0">
          <QrCodeSvg value={CAPTURE_URL} className="w-[clamp(7rem,18vh,13rem)] h-auto" />
        </div>
        <div className="max-w-[24em]">
          <p className="font-serif text-[clamp(1.25rem,3.6vh,2.5rem)] leading-tight">
            {hasPosts ? 'Registre esse momento' : 'Seja o primeiro a mandar!'}
          </p>
          <p className="mt-[1vh] text-[clamp(0.85rem,2vh,1.3rem)] text-white/65 text-balance">
            Aponte a câmera para o QR Code e mande para o telão.
          </p>
        </div>
      </div>
    </main>
  )
}
