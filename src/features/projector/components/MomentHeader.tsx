import type { Challenge } from '@/types/domain'

interface MomentHeaderProps {
  readonly moment: Challenge
  /** Posts of the moment so far. */
  readonly postCount: number
}

/** Moment on air, in place of the names of the couple. */
export function MomentHeader({ moment, postCount }: MomentHeaderProps) {
  return (
    <header className="projector-rise flex lg:block items-baseline justify-between gap-x-4 gap-y-1 flex-wrap">
      <div>
        <p className="flex items-center gap-2 uppercase tracking-[0.25em] text-xs lg:text-[clamp(0.75rem,1.6vh,1.125rem)] text-gold-400">
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-gold-400 animate-ping opacity-60" />
            <span className="relative w-2 h-2 rounded-full bg-gold-400" />
          </span>
          Agora
        </p>
        <h1 className="mt-1 lg:mt-[1.2vh] font-serif italic text-2xl lg:text-[clamp(1.75rem,5vh,3.5rem)] leading-[1.05] tracking-tight">
          {moment.title} <span aria-hidden="true">{moment.icon}</span>
        </h1>
      </div>
      <p className="lg:mt-[1.8vh] whitespace-nowrap tabular-nums text-xs lg:text-[clamp(0.75rem,1.6vh,1.125rem)] text-white/65">
        {postCount} {postCount === 1 ? 'post' : 'posts'} do momento
      </p>
    </header>
  )
}
