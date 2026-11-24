import { useMemo } from 'react'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { rankContributors } from '@/utils/post-stats'

import type { Post } from '@/types/domain'

const PLACES = 3

interface PodiumProps {
  readonly posts: readonly Post[]
}

/** Guests who posted the most. */
export function Podium({ posts }: PodiumProps) {
  const contributors = useMemo(() => rankContributors(posts, PLACES), [posts])

  if (contributors.length === 0) return null

  return (
    <section>
      <h2 className="text-[clamp(0.75rem,1.6vh,1.125rem)] text-gold-400">Top fotógrafos</h2>
      <ol className="mt-[1.4vh] grid grid-cols-3 gap-4">
        {contributors.map((person, index) => (
          <li key={person.name} className="projector-rise min-w-0 flex items-center gap-2.5">
            <div className="relative shrink-0">
              <AuthorAvatar
                name={person.name}
                avatarUrl={person.avatarUrl}
                sizeClassName="w-[4.6vh] h-[4.6vh] min-w-8 min-h-8 text-sm"
                fallbackClassName="bg-white/15 text-white"
              />
              <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-gold-400 text-sage-900 text-[11px] font-bold grid place-items-center">
                {index + 1}
              </span>
            </div>
            <div className="min-w-0 text-[clamp(0.75rem,1.6vh,1.125rem)] leading-tight">
              <p className="truncate font-medium">{person.name.split(' ')[0]}</p>
              <p className="text-white/60 tabular-nums">{person.postCount}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
