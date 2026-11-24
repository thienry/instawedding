import { Camera, CheckCircle2, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import type { Challenge } from '@/types/domain'

interface ChallengeCardProps {
  readonly challenge: Challenge
  /** Whether the guest has posted for it. */
  readonly isCompleted: boolean
  /** Posts from every guest. */
  readonly communityCount: number
}

/** A challenge, with shortcuts to take part and to see its photos. */
export function ChallengeCard({ challenge, isCompleted, communityCount }: ChallengeCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className={`bg-white rounded-3xl p-5 border shadow-xs flex items-center justify-between gap-4 transition-all ${
        isCompleted
          ? 'border-emerald-300/90 bg-emerald-50/25'
          : 'border-sage-200/80 hover:border-sage-300 hover:shadow-md'
      }`}>
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-14 h-14 rounded-2xl bg-sage-50 border border-sage-200/90 flex items-center justify-center text-3xl shrink-0 shadow-2xs">
          {challenge.icon}
        </div>
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-base sm:text-lg font-bold text-sage-900 leading-snug">
              {challenge.title}
            </h3>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Concluído</span>
              </span>
            )}
          </div>
          <p className="text-sm text-sage-800/80 leading-relaxed">{challenge.description}</p>

          {communityCount > 0 && (
            <button
              type="button"
              onClick={() => navigate(`/?challengeId=${challenge.id}`)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-500 hover:underline pt-1">
              <Eye className="w-3.5 h-3.5" />
              <span>
                Ver {communityCount} {communityCount === 1 ? 'foto postada' : 'fotos postadas'}
              </span>
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate(`/capture?challengeId=${challenge.id}`)}
        className={`p-3.5 rounded-2xl transition-all shrink-0 active:scale-95 shadow-2xs ${
          isCompleted
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-sage-900 hover:bg-sage-800 text-white'
        }`}
        title="Cumprir Desafio">
        <Camera className="w-5 h-5" />
      </button>
    </div>
  )
}
