import { Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

import { TopContributors } from '@/features/feed/components/TopContributors'
import { countLikes } from '@/utils/post-stats'

import type { Post } from '@/types/domain'

interface FeedSidebarProps {
  readonly posts: readonly Post[]
}

/** Welcome card, totals and podium, shown on large screens. */
export function FeedSidebar({ posts }: FeedSidebarProps) {
  return (
    <aside className="hidden lg:block lg:col-span-4 sticky top-8 space-y-6">
      <div className="bg-gradient-to-br from-sage-900 to-sage-800 text-white rounded-3xl p-6 shadow-md space-y-4 relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          <img
            src="/favicon.svg"
            alt="Monograma T&P"
            className="w-12 h-12 rounded-2xl shadow-sm shrink-0"
          />
          <div>
            <span className="text-xs uppercase tracking-widest text-gold-400 font-bold">
              Mural Oficial
            </span>
            <h3 className="font-serif text-xl font-bold leading-tight">Thiago &amp; Priscila</h3>
          </div>
        </div>

        <p className="text-sm text-white/85 leading-relaxed">
          Compartilhe seus cliques favoritos da festa, participe dos desafios fotográficos e veja
          tudo no telão!
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <p className="text-2xl font-serif font-bold text-white">{posts.length}</p>
            <p className="text-xs text-white/75 font-medium">Posts na Festa</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <p className="text-2xl font-serif font-bold text-gold-400">{countLikes(posts)}</p>
            <p className="text-xs text-white/75 font-medium">Curtidas na Festa</p>
          </div>
        </div>

        <Link
          to="/challenges"
          className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-gold-400 hover:bg-gold-500 text-sage-900 font-bold text-sm transition-colors shadow-xs">
          <Trophy className="w-4 h-4" />
          <span>Explorar Desafios da Festa</span>
        </Link>
      </div>

      <TopContributors posts={posts} />
    </aside>
  )
}
