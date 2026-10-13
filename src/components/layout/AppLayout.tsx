import { Shield, Tv, WifiOff } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Outlet } from 'react-router-dom'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { OfflineQueueService } from '@/services/offline-queue.service'

import { BottomNavigation } from './BottomNavigation'

export function AppLayout() {
  const isOnline = useNetworkStatus()

  useEffect(() => {
    if (isOnline) {
      OfflineQueueService.flush()
    }
  }, [isOnline])
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

          <div className="flex items-center space-x-1">
            <Link
              to="/admin"
              title="Painel de Moderação"
              className="p-2 rounded-full text-sage-800/60 hover:text-sage-900 hover:bg-sage-100 transition-colors"
            >
              <Shield className="w-4 h-4" />
            </Link>
            <Link
              to="/projector"
              title="Abrir Modo Telão"
              className="p-2 rounded-full text-sage-800/80 hover:text-sage-900 hover:bg-sage-100 transition-colors"
            >
              <Tv className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-amber-600 text-white text-[11px] font-medium px-4 py-2 flex items-center justify-center gap-2 shadow-xs">
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span>
              Você está offline. Fotos serão enviadas quando a conexão voltar.
            </span>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 pb-24 overflow-y-auto">
          <Outlet />
        </main>

        {/* Bottom Bar */}
        <BottomNavigation />
      </div>
    </div>
  )
}
