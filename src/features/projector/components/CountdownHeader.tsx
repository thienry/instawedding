import { useSecondsLeft } from '@/features/projector/hooks/useCountdown'
import { formatCountdown } from '@/utils/moments'

import type { Challenge } from '@/types/domain'

interface CountdownHeaderProps {
  readonly moment: Challenge
  /** When the moment goes on air. */
  readonly start: number
}

/** Countdown to the next moment, in place of the names of the couple. */
export function CountdownHeader({ moment, start }: CountdownHeaderProps) {
  const seconds = useSecondsLeft(start)

  return (
    <header className="projector-rise flex lg:block items-baseline justify-between gap-x-4 gap-y-1 flex-wrap">
      <div>
        <p className="uppercase tracking-[0.25em] text-xs lg:text-[clamp(0.75rem,1.6vh,1.125rem)] text-gold-400">
          Daqui a pouco
        </p>
        <h1 className="mt-1 lg:mt-[1.2vh] font-serif italic text-2xl lg:text-[clamp(1.75rem,5vh,3.5rem)] leading-[1.05] tracking-tight">
          {moment.title} <span aria-hidden="true">{moment.icon}</span>
        </h1>
      </div>
      <p className="lg:mt-[1.2vh] font-serif tabular-nums text-3xl lg:text-[clamp(2.5rem,9vh,6rem)] leading-none text-gold-400">
        {formatCountdown(seconds)}
      </p>
    </header>
  )
}
