import { Camera, Image as ImageIcon, Sparkles, Tv } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import { sidebarLabelClass } from '@/components/layout/sidebar-label'

interface SidebarNavProps {
  readonly isCollapsed: boolean
  readonly unreadCount: number
  readonly canAccessProjector: boolean
}

/** Links to the screens of the app. */
export function SidebarNav({ isCollapsed, unreadCount, canAccessProjector }: SidebarNavProps) {
  const labelTransitionClass = sidebarLabelClass(isCollapsed)

  const getSidebarLinkClass = ({ isActive }: { isActive: boolean }): string =>
    `flex items-center rounded-2xl text-sm font-semibold transition-all duration-300 ease-in-out ${
      isCollapsed ? 'justify-center px-3 py-3' : 'gap-3.5 px-4 py-3'
    } ${
      isActive
        ? 'bg-sage-900 text-white shadow-xs'
        : 'text-sage-800 hover:bg-sage-100 hover:text-sage-900'
    }`

  return (
    <nav className="space-y-1.5">
      <NavLink to="/" end title="Feed de Fotos" className={getSidebarLinkClass}>
        <div className="relative shrink-0">
          <ImageIcon className="w-5 h-5" />
          {isCollapsed && unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className={`flex-1 ${labelTransitionClass}`}>Feed de Fotos</span>
        {!isCollapsed && unreadCount > 0 && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold shadow-2xs animate-in zoom-in-50 duration-150">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </NavLink>

      <NavLink to="/challenges" title="Desafios da Festa" className={getSidebarLinkClass}>
        <Sparkles className="w-5 h-5 shrink-0" />
        <span className={labelTransitionClass}>Desafios da Festa</span>
      </NavLink>

      <NavLink to="/capture" title="Estúdio Fotográfico" className={getSidebarLinkClass}>
        <Camera className="w-5 h-5 shrink-0" />
        <span className={labelTransitionClass}>Estúdio Fotográfico</span>
      </NavLink>

      {canAccessProjector && (
        <Link
          to="/projector"
          title="Modo Telão"
          className={`flex items-center rounded-2xl text-sm font-semibold text-sage-800 hover:bg-sage-100 hover:text-sage-900 transition-all duration-300 ease-in-out ${
            isCollapsed ? 'justify-center px-3 py-3' : 'gap-3.5 px-4 py-3'
          }`}>
          <Tv className="w-5 h-5 shrink-0 text-gold-600" />
          <span className={labelTransitionClass}>Modo Telão</span>
        </Link>
      )}
    </nav>
  )
}
