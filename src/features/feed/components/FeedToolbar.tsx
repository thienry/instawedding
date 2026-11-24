import {
  LayoutGrid,
  LayoutList,
  Loader2,
  LogOut,
  RefreshCw,
  User,
} from 'lucide-react'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'

import type { FeedGuest } from '@/features/feed/hooks/useFeedGuest'
import type { FeedViewMode } from '@/features/feed/types'
import type { LucideIcon } from 'lucide-react'

interface ViewModeOption {
  readonly id: FeedViewMode
  readonly label: string
  readonly title: string
  readonly Icon: LucideIcon
}

const VIEW_MODES: readonly ViewModeOption[] = [
  {
    id: 'list',
    label: 'Lista',
    title: 'Visualização em Lista',
    Icon: LayoutList,
  },
  {
    id: 'grid',
    label: 'Grade',
    title: 'Visualização em Grade',
    Icon: LayoutGrid,
  },
]

interface FeedToolbarProps {
  readonly guest: FeedGuest
  readonly viewMode: FeedViewMode
  readonly onViewModeChange: (mode: FeedViewMode) => void
  readonly isRefreshing: boolean
  readonly onRefresh: () => void
}

/** Guest account, layout switch and refresh. */
export function FeedToolbar({
  guest,
  viewMode,
  onViewModeChange,
  isRefreshing,
  onRefresh,
}: FeedToolbarProps) {
  const { guestUser, isSigningIn, signIn, openAuthPrompt } = guest

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        disabled={isSigningIn}
        onClick={() => {
          if (guestUser) openAuthPrompt()
          else void signIn()
        }}
        className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white border border-sage-200/90 text-sm text-sage-900 hover:bg-sage-100 disabled:opacity-60 font-semibold transition-colors shadow-2xs"
      >
        {guestUser ? (
          <>
            <AuthorAvatar
              name={guestUser.name}
              avatarUrl={guestUser.avatarUrl}
              size="sm"
            />
            <span className="truncate max-w-44">
              Olá, {guestUser.name.split(' ')[0]}
            </span>
            <LogOut className="w-3.5 h-3.5 text-sage-800/50 ml-0.5" />
          </>
        ) : (
          <>
            {isSigningIn ? (
              <Loader2 className="w-4 h-4 text-sage-800 animate-spin" />
            ) : (
              <User className="w-4 h-4 text-sage-800" />
            )}
            <span>{isSigningIn ? 'Conectando...' : 'Entrar com Google'}</span>
          </>
        )}
      </button>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center bg-white border border-sage-200/90 rounded-2xl p-1 shadow-2xs">
          {VIEW_MODES.map(({ id, label, title, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onViewModeChange(id)}
              title={title}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === id
                  ? 'bg-sage-900 text-white shadow-2xs'
                  : 'text-sage-800 hover:bg-sage-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-sage-200/90 text-sm font-semibold text-sage-800 hover:text-sage-900 hover:bg-sage-100 transition-colors shadow-2xs"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span>Atualizar</span>
        </button>
      </div>
    </div>
  )
}
