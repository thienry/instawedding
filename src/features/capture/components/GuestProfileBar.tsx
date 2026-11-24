import { LogOut } from 'lucide-react'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'

import type { GuestUser } from '@/types/domain'

interface GuestProfileBarProps {
  readonly guestUser: GuestUser
  readonly onSignOut: () => void
}

/** Who is posting, before the media is chosen. */
export function GuestProfileBar({ guestUser, onSignOut }: GuestProfileBarProps) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3 border border-sage-200/80 shadow-2xs flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <AuthorAvatar name={guestUser.name} avatarUrl={guestUser.avatarUrl} size="md" />
        <div className="min-w-0">
          <p className="text-xs text-sage-700 font-medium">Postando como</p>
          <p className="text-sm font-bold text-sage-900 truncate">{guestUser.name}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 transition-colors shrink-0"
        title="Desconectar conta Google">
        <LogOut className="w-3.5 h-3.5" />
        <span>Sair</span>
      </button>
    </div>
  )
}
