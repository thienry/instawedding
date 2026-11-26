import { ChevronLeft, ChevronRight } from 'lucide-react'

import { SidebarAdminCard } from '@/components/layout/SidebarAdminCard'
import { SidebarAdminIcons } from '@/components/layout/SidebarAdminIcons'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'

interface SidebarAccountProps {
  readonly adminUser: AdminUser | null
  readonly isCollapsed: boolean
  readonly onToggle: () => void
  readonly onSignOut: () => void
}

/**
 * Admin session and the button that collapses the sidebar. Guests get no link
 * to the admin: the couple sends it to the ceremonial.
 */
export function SidebarAccount({
  adminUser,
  isCollapsed,
  onToggle,
  onSignOut,
}: SidebarAccountProps) {
  if (adminUser) {
    const Account = isCollapsed ? SidebarAdminIcons : SidebarAdminCard
    return <Account adminUser={adminUser} onToggle={onToggle} onSignOut={onSignOut} />
  }

  return (
    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
      <button
        type="button"
        onClick={onToggle}
        title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        className={`flex items-center justify-center rounded-xl bg-sage-50 hover:bg-sage-100 border border-sage-200/80 text-sage-800 hover:text-sage-900 transition-colors shrink-0 ${
          isCollapsed ? 'w-11 h-10' : 'w-9 h-9'
        }`}>
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  )
}
