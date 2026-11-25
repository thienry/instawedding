import { Camera, Image as ImageIcon, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { useFeedNotifications } from '@/hooks/useFeedNotifications'

/** Highlights the icon of the current page. */
const ICON_CLASS =
  'relative mb-1 px-4 py-1 rounded-full transition-colors group-aria-[current=page]:bg-sage-900 group-aria-[current=page]:text-white'

export function BottomNavigation() {
  const { totalUnreadCount } = useFeedNotifications()
  const badgeLabel = totalUnreadCount > 9 ? '9+' : String(totalUnreadCount)

  const getNavClass = ({ isActive }: { isActive: boolean }): string =>
    `group flex flex-col items-center justify-center py-2 text-xs transition-colors ${
      isActive ? 'font-bold text-sage-900' : 'font-medium text-sage-600 hover:text-sage-800'
    }`

  return (
    <nav className="lg:hidden [body:has([data-post-bar])_&]:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-sage-200/80 shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-3 items-center h-18 max-w-lg mx-auto px-2">
        <NavLink to="/" end className={getNavClass}>
          <div className={ICON_CLASS}>
            <ImageIcon className="w-6 h-6" />
            {totalUnreadCount > 0 && (
              <span
                aria-label={`${totalUnreadCount} novos posts`}
                className="absolute -top-1 right-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow-xs ring-2 ring-white animate-in zoom-in-50 duration-150">
                {badgeLabel}
              </span>
            )}
          </div>
          <span>Feed</span>
        </NavLink>

        <NavLink to="/capture" className="flex flex-col items-center justify-center -mt-6">
          <div className="w-15 h-15 rounded-full bg-gradient-to-tr from-sage-800 to-sage-900 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform border-4 border-white">
            <Camera className="w-7 h-7" />
          </div>
          <span className="text-xs font-bold text-sage-900 mt-1">Postar</span>
        </NavLink>

        <NavLink to="/challenges" className={getNavClass}>
          <div className={ICON_CLASS}>
            <Sparkles className="w-6 h-6" />
          </div>
          <span>Desafios</span>
        </NavLink>
      </div>
    </nav>
  )
}
