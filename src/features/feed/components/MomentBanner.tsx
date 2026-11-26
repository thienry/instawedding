import { Camera, Images } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { Challenge } from '@/types/domain'

interface MomentBannerProps {
  readonly moment: Challenge
  /** Whether the feed already shows only the posts of the moment. */
  readonly isFiltered: boolean
  readonly onShowPosts: () => void
}

/** Invites the guests to post the moment on air. */
export function MomentBanner({ moment, isFiltered, onShowPosts }: MomentBannerProps) {
  return (
    <section
      aria-live="polite"
      className="p-4 rounded-3xl bg-sage-900 text-white shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-3xl shrink-0" aria-hidden="true">
          {moment.icon}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold-400">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            Agora
          </p>
          <h2 className="font-serif text-lg font-bold leading-tight">{moment.title}</h2>
          <p className="text-sm text-white/75">{moment.description}</p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          to={`/capture?challengeId=${moment.id}`}
          className="flex-1 sm:flex-none min-h-11 px-4 rounded-full bg-white text-sage-900 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-sage-50 transition-colors">
          <Camera className="w-4 h-4" />
          <span>Postar</span>
        </Link>
        {!isFiltered && (
          <button
            type="button"
            onClick={onShowPosts}
            className="flex-1 sm:flex-none min-h-11 px-4 rounded-full border border-white/40 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
            <Images className="w-4 h-4" />
            <span>Ver posts</span>
          </button>
        )}
      </div>
    </section>
  )
}
