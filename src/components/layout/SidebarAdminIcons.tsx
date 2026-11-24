import { ChevronRight, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'

interface SidebarAdminIconsProps {
  readonly adminUser: AdminUser
  readonly onToggle: () => void
  readonly onSignOut: () => void
}

/** Admin session in the collapsed sidebar. */
export function SidebarAdminIcons({
  adminUser,
  onToggle,
  onSignOut,
}: SidebarAdminIconsProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Link
        to="/admin"
        title={`Painel (${adminUser.name})`}
        className="w-11 h-11 rounded-2xl bg-sage-50 border border-sage-200 flex items-center justify-center text-sm hover:bg-sage-100 transition-colors"
      >
        {adminUser.role === 'admin' ? '👑' : '🛡️'}
      </Link>
      <button
        type="button"
        onClick={onSignOut}
        title="Sair da sessão administrativa"
        className="w-11 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 transition-colors"
      >
        <LogOut className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onToggle}
        title="Expandir menu lateral"
        aria-label="Expandir menu lateral"
        className="w-11 h-10 rounded-xl bg-sage-50 hover:bg-sage-100 border border-sage-200 text-sage-800 hover:text-sage-900 flex items-center justify-center transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
