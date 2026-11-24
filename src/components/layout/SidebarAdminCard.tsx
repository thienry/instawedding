import { ChevronLeft, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'

interface SidebarAdminCardProps {
  readonly adminUser: AdminUser
  readonly onToggle: () => void
  readonly onSignOut: () => void
}

/** Admin session in the expanded sidebar. */
export function SidebarAdminCard({
  adminUser,
  onToggle,
  onSignOut,
}: SidebarAdminCardProps) {
  return (
    <div className="bg-sage-50 rounded-2xl p-3.5 border border-sage-200 space-y-2.5 overflow-hidden">
      <Link
        to="/admin"
        className="flex items-center justify-between hover:opacity-85 transition-opacity"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold text-sage-900 truncate">
            {adminUser.name}
          </p>
          <p className="text-[11px] text-sage-800/70 truncate">
            {adminUser.email}
          </p>
        </div>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${
            adminUser.role === 'admin'
              ? 'bg-gold-500/20 text-gold-500'
              : 'bg-sage-200 text-sage-800'
          }`}
        >
          {adminUser.role === 'admin' ? '👑 Admin' : '🛡️ Mod'}
        </span>
      </Link>
      <div className="flex items-center gap-1.5 pt-1">
        <Link
          to="/admin"
          className="flex-1 text-center py-1.5 px-2.5 rounded-xl bg-white border border-sage-200 text-xs font-semibold text-sage-900 hover:bg-sage-100 transition-colors"
        >
          Painel
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
        <button
          type="button"
          onClick={onToggle}
          title="Recolher menu lateral"
          aria-label="Recolher menu lateral"
          className="p-1.5 rounded-xl bg-white hover:bg-sage-100 border border-sage-200 text-sage-800 hover:text-sage-900 transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
