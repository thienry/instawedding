import { RefreshCw } from 'lucide-react'

import type { PullToRefresh } from '@/features/feed/hooks/usePullToRefresh'

interface PullIndicatorProps {
  readonly pull: PullToRefresh
  readonly isRefreshing: boolean
}

/** Pull-to-refresh feedback, shown on phones. */
export function PullIndicator({ pull, isRefreshing }: PullIndicatorProps) {
  const { distance, progress, isPulling } = pull

  return (
    <div
      aria-live="polite"
      style={{
        height: distance > 0 ? `${distance}px` : '0px',
        opacity: distance > 8 ? Math.min(1, distance / 42) : 0,
      }}
      className={`md:hidden flex items-center justify-center overflow-hidden ${
        isPulling ? '' : 'transition-all duration-300 ease-out'
      }`}>
      <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-sage-200 shadow-sm text-xs font-semibold text-sage-900">
        <RefreshCw
          style={
            !isRefreshing ? { transform: `rotate(${Math.round(progress * 360)}deg)` } : undefined
          }
          className={`w-4 h-4 text-gold-500 ${
            isRefreshing ? 'animate-spin' : 'transition-transform duration-75'
          }`}
        />
        <span>
          {isRefreshing
            ? 'Atualizando mural...'
            : progress === 1
              ? 'Solte para atualizar'
              : 'Puxe para atualizar'}
        </span>
      </div>
    </div>
  )
}
