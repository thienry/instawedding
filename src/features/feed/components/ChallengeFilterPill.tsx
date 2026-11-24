import { Sparkles, X } from 'lucide-react'

import type { Challenge } from '@/types/domain'

interface ChallengeFilterPillProps {
  readonly challengeId: number
  readonly challenge: Challenge | undefined
  readonly onClear: () => void
}

/** Challenge the feed is filtered by. */
export function ChallengeFilterPill({ challengeId, challenge, onClear }: ChallengeFilterPillProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gold-400/15 border border-gold-400/35 text-sm text-sage-900">
      <div className="flex items-center gap-2 font-semibold">
        <Sparkles className="w-4 h-4 text-gold-500 shrink-0" />
        <span>
          Filtrando por desafio:{' '}
          {challenge ? `${challenge.icon} ${challenge.title}` : `#${challengeId}`}
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="p-1.5 rounded-full hover:bg-gold-400/20 text-sage-800"
        title="Limpar filtro de desafio">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
