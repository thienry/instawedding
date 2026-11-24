import { AlertCircle } from 'lucide-react'

interface ChallengesErrorProps {
  readonly onRetry: () => void
}

/** Shown when the challenges could not be loaded. */
export function ChallengesError({ onRetry }: ChallengesErrorProps) {
  return (
    <div
      role="alert"
      className="bg-white rounded-3xl p-8 border border-sage-200/80 text-center space-y-4 shadow-xs"
    >
      <AlertCircle className="w-8 h-8 mx-auto text-rose-600" />
      <p className="text-sm text-sage-800">
        Não foi possível carregar os desafios. Verifique sua conexão e tente
        novamente.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-5 py-2.5 rounded-2xl bg-sage-900 hover:bg-sage-800 text-white text-sm font-semibold transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
