import { Award, Heart } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { rankContributors } from '@/utils/post-stats'

import type { Post } from '@/types/domain'

const MEDALS = ['🥇', '🥈', '🥉']

interface TopContributorsProps {
  readonly posts: readonly Post[]
}

/** Podium of the guests who posted the most. */
export function TopContributors({ posts }: TopContributorsProps) {
  const contributors = useMemo(() => rankContributors(posts, MEDALS.length), [posts])

  if (contributors.length === 0) return null

  return (
    <div className="bg-white rounded-3xl p-5 border border-sage-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-gold-500" />
          <h3 className="font-serif text-base font-bold text-sage-900">Top Fotógrafos da Noite</h3>
        </div>
        <Link to="/challenges" className="text-xs font-semibold text-gold-500 hover:underline">
          Ver todos
        </Link>
      </div>

      <div className="space-y-2.5">
        {contributors.map((person, index) => (
          <div
            key={person.name}
            className="flex items-center justify-between p-3 rounded-2xl bg-sage-50/80 border border-sage-200/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg leading-none shrink-0">{MEDALS[index]}</span>
              <AuthorAvatar name={person.name} avatarUrl={person.avatarUrl} size="sm" />
              <span className="text-sm font-bold text-sage-900 truncate">{person.name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-sage-800 shrink-0">
              <span>📷 {person.postCount}</span>
              <span className="inline-flex items-center gap-1 text-rose-600">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                {person.likes}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
