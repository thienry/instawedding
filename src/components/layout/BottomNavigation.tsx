import { NavLink } from 'react-router-dom';
import { Camera, Image as ImageIcon, Sparkles } from 'lucide-react';

export function BottomNavigation() {
  const getNavClass = ({ isActive }: { isActive: boolean }): string =>
    `flex flex-col items-center justify-center py-2 flex-1 text-xs font-medium transition-colors ${
      isActive ? 'text-sage-900 font-semibold' : 'text-sage-800/60 hover:text-sage-800'
    }`;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-sage-200/80 max-w-md mx-auto shadow-lg pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        <NavLink to="/" end className={getNavClass}>
          <ImageIcon className="w-5 h-5 mb-1" />
          <span>Feed</span>
        </NavLink>

        <NavLink
          to="/capture"
          className="flex flex-col items-center justify-center -mt-5"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-sage-800 to-sage-900 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform border-4 border-white">
            <Camera className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-semibold text-sage-900 mt-1">Foto</span>
        </NavLink>

        <NavLink to="/challenges" className={getNavClass}>
          <Sparkles className="w-5 h-5 mb-1" />
          <span>Desafios</span>
        </NavLink>
      </div>
    </nav>
  );
}
