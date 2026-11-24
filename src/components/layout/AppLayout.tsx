import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  LogOut,
  Shield,
  Sparkles,
  Tv,
  WifiOff,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { useFeedNotifications } from '@/hooks/useFeedNotifications'
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { getAdminAuthService } from '@/services/admin-auth.factory'
import { OfflineQueueService } from '@/services/offline-queue.service'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'

const SIDEBAR_STORAGE_KEY = 'instawedding_sidebar_collapsed'

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Casamento de Thiago & Priscila — Álbum & Mural',
  '/capture': 'Postar Foto | Casamento de Thiago & Priscila',
  '/challenges': 'Desafios da Festa | Casamento de Thiago & Priscila',
  '/admin': 'Painel de Moderação | Casamento de Thiago & Priscila',
}

export function AppLayout() {
  useInactivityTimeout()
  const isOnline = useNetworkStatus()
  const { totalUnreadCount } = useFeedNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const adminAuth = getAdminAuthService()
  const [adminUser, setAdminUser] = useState<AdminUser | null>(
    adminAuth.getCurrentUser()
  )
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') {
      return false
    }
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  })

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      }
      return next
    })
  }

  useEffect(() => {
    const baseTitle =
      ROUTE_TITLES[location.pathname] ??
      'Casamento de Thiago & Priscila — Álbum & Mural'
    document.title =
      totalUnreadCount > 0 ? `(${totalUnreadCount}) ${baseTitle}` : baseTitle
  }, [location.pathname, totalUnreadCount])

  useEffect(() => {
    if (isOnline) {
      OfflineQueueService.flush()
    }
  }, [isOnline])

  useEffect(() => {
    let isMounted = true

    adminAuth.checkSession().then((hasSession) => {
      if (isMounted) {
        setAdminUser(hasSession ? adminAuth.getCurrentUser() : null)
      }
    })

    const unsubscribe = adminAuth.onAuthStateChange((user) => {
      if (isMounted) {
        setAdminUser(user)
      }
    })
    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [adminAuth])

  const canAccessProjector = Boolean(
    adminUser && (adminUser.role === 'admin' || adminUser.role === 'moderator')
  )

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

  const getSidebarLinkClass = ({ isActive }: { isActive: boolean }): string =>
    `flex items-center rounded-2xl text-sm font-semibold transition-all duration-300 ease-in-out ${
      isSidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3.5 px-4 py-3'
    } ${
      isActive
        ? 'bg-sage-900 text-white shadow-xs'
        : 'text-sage-800 hover:bg-sage-100 hover:text-sage-900'
    }`

  const labelTransitionClass = `whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
    isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'
  }`

  return (
    <div className="min-h-screen bg-sage-50 flex flex-col md:flex-row text-sage-900">
      {/* Desktop / Notebook Left Sidebar Navigation */}
      <aside
        className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 bg-white border-r border-sage-200/80 z-30 justify-between shadow-2xs transition-[width,padding] duration-300 ease-in-out ${
          isSidebarCollapsed ? 'md:w-20 p-3' : 'md:w-64 lg:w-72 p-5'
        }`}
      >
        <div className="space-y-6">
          {/* Brand Logo & Title */}
          <Link
            to="/"
            title="Thiago & Priscila — Álbum & Mural"
            className={`flex items-center py-1 group rounded-2xl transition-all duration-300 ease-in-out ${
              isSidebarCollapsed ? 'justify-center px-0' : 'gap-3.5 px-2'
            }`}
          >
            <img
              src="/favicon.svg"
              alt="Logo Thiago & Priscila"
              className="w-11 h-11 rounded-xl shadow-xs group-hover:scale-105 transition-transform shrink-0"
            />
            <div className={labelTransitionClass}>
              <h1 className="font-serif text-xl font-bold tracking-tight text-sage-900 leading-tight truncate">
                Thiago &amp; Priscila
              </h1>
              <p className="text-xs font-medium text-sage-800/65 truncate">
                Álbum &amp; Mural
              </p>
            </div>
          </Link>

          {/* Primary Action Button */}
          <Link
            to="/capture"
            title="Postar Nova Foto"
            className={`flex items-center justify-center w-full rounded-2xl bg-gradient-to-r from-sage-900 to-sage-800 hover:from-sage-800 hover:to-sage-900 text-white font-semibold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-300 ease-in-out ${
              isSidebarCollapsed ? 'py-3.5 px-0' : 'gap-2.5 py-3.5 px-4'
            }`}
          >
            <Camera className="w-5 h-5 text-gold-400 shrink-0" />
            <span className={labelTransitionClass}>Postar Nova Foto</span>
          </Link>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            <NavLink
              to="/"
              end
              title="Feed de Fotos"
              className={getSidebarLinkClass}
            >
              <div className="relative shrink-0">
                <ImageIcon className="w-5 h-5" />
                {isSidebarCollapsed && totalUnreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                  </span>
                )}
              </div>
              <span className={`flex-1 ${labelTransitionClass}`}>
                Feed de Fotos
              </span>
              {!isSidebarCollapsed && totalUnreadCount > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold shadow-2xs animate-in zoom-in-50 duration-150">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </span>
              )}
            </NavLink>

            <NavLink
              to="/challenges"
              title="Desafios da Festa"
              className={getSidebarLinkClass}
            >
              <Sparkles className="w-5 h-5 shrink-0" />
              <span className={labelTransitionClass}>Desafios da Festa</span>
            </NavLink>

            <NavLink
              to="/capture"
              title="Estúdio Fotográfico"
              className={getSidebarLinkClass}
            >
              <Camera className="w-5 h-5 shrink-0" />
              <span className={labelTransitionClass}>Estúdio Fotográfico</span>
            </NavLink>

            {canAccessProjector && (
              <Link
                to="/projector"
                title="Modo Telão"
                className={`flex items-center rounded-2xl text-sm font-semibold text-sage-800 hover:bg-sage-100 hover:text-sage-900 transition-all duration-300 ease-in-out ${
                  isSidebarCollapsed
                    ? 'justify-center px-3 py-3'
                    : 'gap-3.5 px-4 py-3'
                }`}
              >
                <Tv className="w-5 h-5 shrink-0 text-gold-500" />
                <span className={labelTransitionClass}>Modo Telão</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Bottom Admin & Collapse Toggle Section */}
        <div className="pt-4 border-t border-sage-200/80 space-y-2.5">
          {adminUser ? (
            isSidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Link
                  to="/admin"
                  title={`Painel (${adminUser.name})`}
                  className="w-11 h-11 rounded-2xl bg-sage-50 border border-sage-200 flex items-center justify-center text-sm hover:bg-sage-100 transition-colors"
                >
                  {adminUser.role === 'admin' ? '👑' : '🛡️'}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sair da sessão administrativa"
                  className="w-11 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  title="Expandir menu lateral"
                  aria-label="Expandir menu lateral"
                  className="w-11 h-10 rounded-xl bg-sage-50 hover:bg-sage-100 border border-sage-200 text-sage-800 hover:text-sage-900 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="bg-sage-50 rounded-2xl p-3.5 border border-sage-200 space-y-2.5 overflow-hidden">
                <Link
                  to="/admin"
                  className="flex items-center justify-between hover:opacity-85 transition-opacity"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-sage-900 truncate">
                      {adminUser.name}
                    </p>
                    <p className="text-[11px] text-sage-800/70 truncate">
                      {adminUser.email}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${
                      adminUser.role === 'admin'
                        ? 'bg-gold-500/20 text-gold-500'
                        : 'bg-sage-200 text-sage-800'
                    }`}
                  >
                    {adminUser.role === 'admin' ? '👑 Admin' : '🛡️ Mod'}
                  </span>
                </Link>
                <div className="flex items-center gap-1.5 pt-1">
                  <Link
                    to="/admin"
                    className="flex-1 text-center py-1.5 px-2.5 rounded-xl bg-white border border-sage-200 text-xs font-semibold text-sage-900 hover:bg-sage-100 transition-colors"
                  >
                    Painel
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    title="Recolher menu lateral"
                    aria-label="Recolher menu lateral"
                    className="p-1.5 rounded-xl bg-white hover:bg-sage-100 border border-sage-200 text-sage-800 hover:text-sage-900 transition-colors shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          ) : (
            <div
              className={`flex items-center transition-all duration-300 ease-in-out ${
                isSidebarCollapsed ? 'flex-col gap-2' : 'justify-between gap-2'
              }`}
            >
              <Link
                to="/admin"
                title="Painel de Moderação"
                className={`flex items-center rounded-xl text-xs font-semibold text-sage-800/75 hover:text-sage-900 hover:bg-sage-100 transition-all duration-300 ease-in-out ${
                  isSidebarCollapsed
                    ? 'justify-center w-11 h-10 px-0'
                    : 'flex-1 gap-3 px-3.5 py-2.5'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span className={labelTransitionClass}>
                  Painel de Moderação
                </span>
              </Link>

              <button
                type="button"
                onClick={toggleSidebar}
                title={
                  isSidebarCollapsed
                    ? 'Expandir menu lateral'
                    : 'Recolher menu lateral'
                }
                aria-label={
                  isSidebarCollapsed
                    ? 'Expandir menu lateral'
                    : 'Recolher menu lateral'
                }
                className={`flex items-center justify-center rounded-xl bg-sage-50 hover:bg-sage-100 border border-sage-200/80 text-sage-800 hover:text-sage-900 transition-colors shrink-0 ${
                  isSidebarCollapsed ? 'w-11 h-10' : 'w-9 h-9'
                }`}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64 lg:pl-72'
        }`}
      >
        {/* Mobile Sticky Header */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sage-200/80 px-4 py-3 flex items-center justify-between shadow-2xs">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/favicon.svg"
              alt="Logo Thiago & Priscila"
              className="w-9 h-9 rounded-xl shadow-2xs group-hover:scale-105 transition-transform"
            />
            <div>
              <h1 className="font-serif text-xl font-bold tracking-tight text-sage-900 leading-none">
                Thiago &amp; Priscila
              </h1>
              <span className="text-[11px] text-sage-800/70 font-medium">
                Mural do Casamento
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-1.5">
            {adminUser ? (
              <div className="flex items-center gap-1.5 bg-sage-100 rounded-full pl-2.5 pr-1.5 py-1 border border-sage-300 shadow-2xs">
                <Link
                  to="/admin"
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                  title={`Conectado como ${adminUser.name}`}
                >
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-sm bg-gold-500/20 text-gold-500">
                    {adminUser.role === 'admin' ? '👑 Admin' : '🛡️ Mod'}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Encerrar sessão administrativa"
                  className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-full transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/admin"
                title="Painel de Moderação"
                className="p-2.5 rounded-full text-sage-800/70 hover:text-sage-900 hover:bg-sage-100 transition-colors"
              >
                <Shield className="w-5 h-5" />
              </Link>
            )}

            {canAccessProjector && (
              <Link
                to="/projector"
                title="Abrir Modo Telão"
                className="p-2.5 rounded-full text-sage-800/80 hover:text-sage-900 hover:bg-sage-100 transition-colors"
              >
                <Tv className="w-5 h-5" />
              </Link>
            )}
          </div>
        </header>

        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-amber-600 text-white text-xs sm:text-sm font-medium px-4 py-2.5 flex items-center justify-center gap-2 shadow-xs">
            <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
            <span>
              Você está offline. Suas fotos serão enviadas assim que a conexão
              voltar.
            </span>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full pb-24 md:pb-12">
          <Outlet />
        </main>

        {/* Mobile Bottom Bar */}
        <BottomNavigation />
      </div>
    </div>
  )
}
