import { LogOut } from 'lucide-react'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'

import type { GuestUser } from '@/types/domain'

interface AuthorSummaryProps {
  readonly guestUser: GuestUser
  readonly onSignOut: () => void
}

/** Who signs the post. */
export function AuthorSummary({ guestUser, onSignOut }: AuthorSummaryProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-sage-50/80 border border-sage-200/80">
      <div className="flex items-center gap-3 min-w-0">
        <AuthorAvatar
          name={guestUser.name}
          avatarUrl={guestUser.avatarUrl}
          size="md"
        />
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-800/60 block">
            Assinado por
          </span>
          <p className="text-sm font-bold text-sage-900 truncate">
            {guestUser.name}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-sage-200 hover:border-rose-200 text-xs font-semibold text-sage-800 hover:text-rose-700 transition-colors shrink-0"
        title="Sair ou trocar conta Google"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Trocar conta</span>
      </button>
    </div>
  )
}
