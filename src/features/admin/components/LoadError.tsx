import { RefreshCw } from 'lucide-react'

interface LoadErrorProps {
  readonly onRetry: () => void
}

/** Warning that the dashboard may be out of date. */
export function LoadError({ onRetry }: LoadErrorProps) {
  return (
    <div
      role="alert"
      className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-sm text-amber-900">
      <span>Não foi possível atualizar o painel. Os posts podem estar desatualizados.</span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 min-h-11 px-4 rounded-xl bg-white border border-amber-300 font-semibold">
        <RefreshCw className="w-4 h-4" />
        <span>Tentar de novo</span>
      </button>
    </div>
  )
}
