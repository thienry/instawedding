import type { Challenge } from '@/types/domain'

interface MomentBadgeProps {
  readonly moment: Challenge
  /** Whether a post of the moment has arrived yet. */
  readonly hasPosts: boolean
}

/** Name of the moment on air, over the stage. */
export function MomentBadge({ moment, hasPosts }: MomentBadgeProps) {
  return (
    <div className="absolute inset-x-0 top-[4%] z-20 flex justify-center pointer-events-none">
      <div className="projector-arrival-static max-w-[88%] px-[3.5vh] py-[1.4vh] rounded-full text-center">
        <p className="font-serif text-[clamp(1.1rem,3.2vh,2.25rem)] leading-tight">
          <span className="text-gold-400">Agora:</span> {moment.title} {moment.icon}
        </p>
        {!hasPosts && (
          <p className="text-[clamp(0.75rem,1.8vh,1.2rem)] text-white/70">{moment.description}</p>
        )}
      </div>
    </div>
  )
}
