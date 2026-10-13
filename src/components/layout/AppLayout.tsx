import { Outlet, Link } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { Tv } from 'lucide-react';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-sage-100 flex justify-center">
      <div className="w-full max-w-md bg-sage-50 min-h-screen flex flex-col relative shadow-xl border-x border-sage-200/50">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-sage-200/70 px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-lg font-bold tracking-tight text-sage-900 leading-none">
              Thiago & Priscila
            </h1>
            <p className="text-[11px] text-gold-500 font-medium tracking-wider uppercase mt-0.5">
              InstaWedding • Ao Vivo
            </p>
          </div>

          <Link
            to="/projector"
            title="Abrir Modo Telão"
            className="p-2 rounded-full text-sage-800/80 hover:text-sage-900 hover:bg-sage-100 transition-colors"
          >
            <Tv className="w-5 h-5" />
          </Link>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 pb-24 overflow-y-auto">
          <Outlet />
        </main>

        {/* Bottom Bar */}
        <BottomNavigation />
      </div>
    </div>
  );
}
