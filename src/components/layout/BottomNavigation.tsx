import { Camera, Image as ImageIcon, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export function BottomNavigation() {
  const getNavClass = ({ isActive }: { isActive: boolean }): string =>
    `flex flex-col items-center justify-center py-2 text-xs font-semibold transition-colors ${
      isActive ? 'text-sage-900' : 'text-sage-800/60 hover:text-sage-800'
    }`

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-sage-200/80 shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-3 items-center h-18 max-w-lg mx-auto px-2">
        <NavLink to="/" end className={getNavClass}>
          <ImageIcon className="w-6 h-6 mb-1" />
          <span>Feed</span>
        </NavLink>

        <NavLink
          to="/capture"
          className="flex flex-col items-center justify-center -mt-6"
        >
          <div className="w-15 h-15 rounded-full bg-gradient-to-tr from-sage-800 to-sage-900 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform border-4 border-white">
            <Camera className="w-7 h-7" />
          </div>
          <span className="text-xs font-bold text-sage-900 mt-1">
            Postar
          </span>
        </NavLink>

        <NavLink to="/challenges" className={getNavClass}>
          <Sparkles className="w-6 h-6 mb-1" />
          <span>Desafios</span>
        </NavLink>
      </div>
    </nav>
  )
}
