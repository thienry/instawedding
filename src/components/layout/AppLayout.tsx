import { LogOut, Shield, Tv, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { getAdminAuthService } from '@/services/admin-auth.factory'
import { OfflineQueueService } from '@/services/offline-queue.service'

import { BottomNavigation } from './BottomNavigation'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'

export function AppLayout() {
  const isOnline = useNetworkStatus()
  const navigate = useNavigate()
  const adminAuth = getAdminAuthService()
  const [adminUser, setAdminUser] = useState<AdminUser | null>(
    adminAuth.getCurrentUser()
  )

  useEffect(() => {
    if (isOnline) {
      OfflineQueueService.flush()
    }
  }, [isOnline])

  useEffect(() => {
    const unsubscribe = adminAuth.onAuthStateChange((user) => {
      setAdminUser(user)
    })
    return () => {
      unsubscribe()
    }
  }, [adminAuth])

  const handleLogout = async () => {
    await adminAuth.logout()
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear()
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('instawedding_mock_admin_user')
      localStorage.removeItem('instawedding_mock_admin_auth')
    }
    setAdminUser(null)
    navigate('/')
  }

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

          <div className="flex items-center space-x-1.5">
            {/* Authenticated Admin / Moderator Badge and Logout */}
            {adminUser ? (
              <div className="flex items-center gap-1.5 bg-sage-100 rounded-full pl-2 pr-1 py-1 border border-sage-300 shadow-2xs">
                <Link
                  to="/admin"
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                  title={`Conectado como ${adminUser.name} (${adminUser.email})`}
                >
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                      adminUser.role === 'admin'
                        ? 'bg-gold-500/20 text-gold-700'
                        : 'bg-sage-200 text-sage-800'
                    }`}
                  >
                    {adminUser.role === 'admin' ? '👑 Admin' : '🛡️ Mod'}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Encerrar sessão administrativa"
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <Link
                to="/admin"
                title="Painel de Moderação"
                className="p-2 rounded-full text-sage-800/60 hover:text-sage-900 hover:bg-sage-100 transition-colors"
              >
                <Shield className="w-4 h-4" />
              </Link>
            )}

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
