import { RefreshCw, WifiOff } from 'lucide-react'

interface FeedErrorProps {
  readonly isRetrying: boolean
  readonly onRetry: () => void
}

/** Shown when the posts could not be loaded. */
export function FeedError({ isRetrying, onRetry }: FeedErrorProps) {
  return (
    <div
      role="alert"
      className="bg-white rounded-3xl p-10 border border-sage-200 text-center space-y-4 shadow-xs">
      <WifiOff className="w-10 h-10 mx-auto text-sage-700" />
      <h3 className="font-serif text-xl font-bold text-sage-900">
        Não foi possível carregar os posts
      </h3>
      <p className="text-sm text-sage-700 max-w-md mx-auto leading-relaxed">
        Verifique a internet. Vamos tentar de novo automaticamente.
      </p>
      <button
        type="button"
        disabled={isRetrying}
        onClick={onRetry}
        className="inline-flex items-center gap-2 mt-2 px-6 py-3 rounded-full bg-sage-900 text-white text-sm font-semibold hover:bg-sage-800 disabled:opacity-60 transition-colors shadow-sm">
        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>Tentar agora</span>
      </button>
    </div>
  )
}
