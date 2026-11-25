import { Award, Heart } from 'lucide-react'
import { useMemo } from 'react'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { rankContributors } from '@/utils/post-stats'

import type { Post } from '@/types/domain'

const MEDALS = ['🥇', '🥈', '🥉']

interface PhotographerRankingProps {
  readonly posts: readonly Post[]
}

/** Guests who posted the most. */
export function PhotographerRanking({ posts }: PhotographerRankingProps) {
  const ranking = useMemo(() => rankContributors(posts, MEDALS.length), [posts])

  if (ranking.length === 0) return null

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-sage-200/80 shadow-xs space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-gold-600" />
          <h3 className="font-serif text-lg font-bold text-sage-900">Top Fotógrafos da Noite</h3>
        </div>
        <span className="hidden sm:inline text-xs font-bold text-sage-700 uppercase tracking-wider">
          Ranking
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        {ranking.map((person, index) => {
          return (
            <div
              key={person.name}
              className={`rounded-2xl px-3 py-2 sm:p-4 border min-w-0 flex sm:flex-col items-center justify-between sm:justify-center sm:text-center gap-3 ${
                index === 0
                  ? 'bg-gold-400/10 border-gold-400/45 shadow-2xs'
                  : 'bg-sage-50/80 border-sage-200/70'
              }`}>
              <div className="flex sm:flex-col items-center gap-3 sm:gap-1.5 min-w-0 max-w-full">
                <div className="relative shrink-0">
                  <AuthorAvatar name={person.name} avatarUrl={person.avatarUrl} size="md" />
                  <span className="absolute -bottom-1 -right-1 text-base leading-none">
                    {MEDALS[index]}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-sage-900 truncate max-w-full">
                  {person.name}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 text-xs sm:text-sm text-sage-800/85 font-semibold shrink-0">
                <span>
                  📷 {person.postCount} {person.postCount === 1 ? 'post' : 'posts'}
                </span>
                <span className="inline-flex items-center gap-1 text-rose-600">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  {person.likes}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
