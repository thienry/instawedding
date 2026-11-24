import { Camera } from 'lucide-react'
import { Link } from 'react-router-dom'

import { sidebarLabelClass } from '@/components/layout/sidebar-label'
import { SidebarAccount } from '@/components/layout/SidebarAccount'
import { SidebarNav } from '@/components/layout/SidebarNav'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'

interface SidebarProps {
  readonly adminUser: AdminUser | null
  readonly isCollapsed: boolean
  readonly unreadCount: number
  readonly onToggle: () => void
  readonly onSignOut: () => void
}

/** Side menu shown on tablets and desktops. */
export function Sidebar({
  adminUser,
  isCollapsed,
  unreadCount,
  onToggle,
  onSignOut,
}: SidebarProps) {
  const labelTransitionClass = sidebarLabelClass(isCollapsed)

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 overflow-y-auto bg-white border-r border-sage-200/80 z-30 justify-between shadow-2xs transition-[width,padding] duration-300 ease-in-out ${
        isCollapsed ? 'lg:w-20 p-3' : 'lg:w-72 p-5'
      }`}>
      <div className="space-y-6">
        {/* Brand Logo & Title */}
        <Link
          to="/"
          title="Thiago & Priscila — Álbum & Mural"
          className={`flex items-center py-1 group rounded-2xl transition-all duration-300 ease-in-out ${
            isCollapsed ? 'justify-center px-0' : 'gap-3.5 px-2'
          }`}>
          <img
            src="/favicon.svg"
            alt="Logo Thiago & Priscila"
            className="w-11 h-11 rounded-xl shadow-xs group-hover:scale-105 transition-transform shrink-0"
          />
          <div className={labelTransitionClass}>
            <h1 className="font-serif text-xl font-bold tracking-tight text-sage-900 leading-tight truncate">
              Thiago &amp; Priscila
            </h1>
            <p className="text-xs font-medium text-sage-700 truncate">Álbum &amp; Mural</p>
          </div>
        </Link>

        {/* Primary Action Button */}
        <Link
          to="/capture"
          title="Postar Nova Foto"
          className={`flex items-center justify-center w-full rounded-2xl bg-gradient-to-r from-sage-900 to-sage-800 hover:from-sage-800 hover:to-sage-900 text-white font-semibold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-300 ease-in-out ${
            isCollapsed ? 'py-3.5 px-0' : 'gap-2.5 py-3.5 px-4'
          }`}>
          <Camera className="w-5 h-5 text-gold-400 shrink-0" />
          <span className={labelTransitionClass}>Postar Nova Foto</span>
        </Link>

        <SidebarNav
          isCollapsed={isCollapsed}
          unreadCount={unreadCount}
          canAccessProjector={adminUser !== null && adminUser.role !== 'guest'}
        />
      </div>

      <div className="pt-4 border-t border-sage-200/80 space-y-2.5">
        <SidebarAccount
          adminUser={adminUser}
          isCollapsed={isCollapsed}
          onToggle={onToggle}
          onSignOut={onSignOut}
        />
      </div>
    </aside>
  )
}
