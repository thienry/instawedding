import { Heart } from 'lucide-react'
import { useMemo } from 'react'

import { countLikes } from '@/utils/post-stats'

import type { Post } from '@/types/domain'

interface ProjectorHeaderProps {
  readonly posts: readonly Post[]
}

/** Names of the couple and the numbers of the party. */
export function ProjectorHeader({ posts }: ProjectorHeaderProps) {
  const likesCount = useMemo(() => countLikes(posts), [posts])

  return (
    <header className="projector-rise flex lg:block items-baseline justify-between gap-4">
      <h1 className="font-serif text-2xl lg:text-[clamp(1.75rem,5vh,3.5rem)] leading-[1.05] tracking-tight">
        Thiago <span className="italic text-gold-400">&amp;</span>{' '}
        <span className="lg:block">Priscila</span>
      </h1>
      <p className="lg:mt-[1.8vh] flex items-center gap-4 text-xs lg:text-[clamp(0.75rem,1.6vh,1.125rem)] text-white/65">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-gold-400 animate-ping opacity-60" />
            <span className="relative w-2 h-2 rounded-full bg-gold-400" />
          </span>
          Ao vivo
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Heart className="w-[1em] h-[1em] fill-current text-rose-300" />
          {likesCount} {likesCount === 1 ? 'curtida' : 'curtidas'}
        </span>
      </p>
    </header>
  )
}
