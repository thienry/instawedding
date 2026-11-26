import { useSecondsLeft } from '@/features/projector/hooks/useCountdown'

import type { Challenge } from '@/types/domain'

interface CountdownStageProps {
  readonly moment: Challenge
  /** When the moment goes on air. */
  readonly start: number
}

/** Last seconds before the moment, for the whole room to count along. */
export function CountdownStage({ moment, start }: CountdownStageProps) {
  const seconds = useSecondsLeft(start)

  return (
    <main className="relative h-full flex flex-col items-center justify-center text-center p-6 gap-[2vh]">
      <p className="projector-rise font-serif italic text-[clamp(1.75rem,6vh,4.5rem)] leading-tight text-balance">
        {moment.title} <span aria-hidden="true">{moment.icon}</span>
      </p>
      <p
        key={seconds}
        aria-live="off"
        className="projector-tick font-serif tabular-nums leading-none text-gold-400 text-[clamp(8rem,52vh,36rem)]">
        {seconds}
      </p>
    </main>
  )
}
