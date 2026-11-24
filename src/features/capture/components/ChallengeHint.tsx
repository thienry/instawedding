import { Sparkles } from 'lucide-react'

/** Tells the guest that the post will count for a challenge. */
export function ChallengeHint() {
  return (
    <div className="p-4 bg-gold-400/15 border border-gold-400/35 rounded-2xl flex items-center gap-3">
      <Sparkles className="w-5 h-5 text-gold-500 shrink-0" />
      <p className="text-sm text-sage-900 font-medium">
        Você iniciou um desafio especial! Sua publicação será vinculada
        automaticamente.
      </p>
    </div>
  )
}
