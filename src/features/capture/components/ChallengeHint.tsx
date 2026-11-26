import { Sparkles } from 'lucide-react'

import type { Challenge } from '@/types/domain'

interface ChallengeHintProps {
  /** Moment the post goes to, instead of a challenge. */
  readonly moment?: Challenge
}

/** Tells the guest that the post will count for a challenge or a moment. */
export function ChallengeHint({ moment }: ChallengeHintProps) {
  return (
    <div className="p-4 bg-gold-400/15 border border-gold-400/35 rounded-2xl flex items-center gap-3">
      <Sparkles className="w-5 h-5 text-gold-600 shrink-0" />
      <p className="text-sm text-sage-900 font-medium">
        {moment
          ? `Agora: ${moment.title} ${moment.icon}. Sua publicação vai para esse momento.`
          : 'Você iniciou um desafio especial! Sua publicação será vinculada automaticamente.'}
      </p>
    </div>
  )
}
