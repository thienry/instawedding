import { ChevronLeft, ChevronRight, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

import { sidebarLabelClass } from '@/components/layout/sidebar-label'
import { SidebarAdminCard } from '@/components/layout/SidebarAdminCard'
import { SidebarAdminIcons } from '@/components/layout/SidebarAdminIcons'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'

interface SidebarAccountProps {
  readonly adminUser: AdminUser | null
  readonly isCollapsed: boolean
  readonly onToggle: () => void
  readonly onSignOut: () => void
}

/** Admin session and the button that collapses the sidebar. */
export function SidebarAccount({
  adminUser,
  isCollapsed,
  onToggle,
  onSignOut,
}: SidebarAccountProps) {
  if (adminUser) {
    const Account = isCollapsed ? SidebarAdminIcons : SidebarAdminCard
    return (
      <Account
        adminUser={adminUser}
        onToggle={onToggle}
        onSignOut={onSignOut}
      />
    )
  }

  const labelTransitionClass = sidebarLabelClass(isCollapsed)

  return (
    <div
      className={`flex items-center transition-all duration-300 ease-in-out ${
        isCollapsed ? 'flex-col gap-2' : 'justify-between gap-2'
      }`}
    >
      <Link
        to="/admin"
        title="Painel de Moderação"
        className={`flex items-center rounded-xl text-xs font-semibold text-sage-800/75 hover:text-sage-900 hover:bg-sage-100 transition-all duration-300 ease-in-out ${
          isCollapsed
            ? 'justify-center w-11 h-10 px-0'
            : 'flex-1 gap-3 px-3.5 py-2.5'
        }`}
      >
        <Shield className="w-4 h-4 shrink-0" />
        <span className={labelTransitionClass}>Painel de Moderação</span>
      </Link>

      <button
        type="button"
        onClick={onToggle}
        title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        aria-label={
          isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'
        }
        className={`flex items-center justify-center rounded-xl bg-sage-50 hover:bg-sage-100 border border-sage-200/80 text-sage-800 hover:text-sage-900 transition-colors shrink-0 ${
          isCollapsed ? 'w-11 h-10' : 'w-9 h-9'
        }`}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}
