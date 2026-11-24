import { LogOut, Shield, Tv } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'

interface MobileHeaderProps {
  readonly adminUser: AdminUser | null
  readonly onSignOut: () => void
}

/** Top bar shown on phones. */
export function MobileHeader({ adminUser, onSignOut }: MobileHeaderProps) {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sage-200/80 px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
      <Link to="/" className="flex items-center gap-2.5 group min-w-0">
        <img
          src="/favicon.svg"
          alt="Logo Thiago & Priscila"
          className="w-9 h-9 rounded-xl shadow-2xs group-hover:scale-105 transition-transform"
        />
        <div className="min-w-0">
          <h1 className="font-serif text-lg truncate font-bold tracking-tight text-sage-900 leading-none">
            Thiago &amp; Priscila
          </h1>
          <span className="text-xs text-sage-700 font-medium hidden min-[360px]:block truncate">
            Mural do Casamento
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-0.5 shrink-0">
        {adminUser ? (
          <div className="flex items-center gap-0.5">
            <Link
              to="/admin"
              className="flex items-center min-h-11 px-1.5"
              title={`Conectado como ${adminUser.name}`}>
              <span className="text-xs font-bold whitespace-nowrap px-2 py-1 rounded-full bg-gold-400/25 text-gold-600">
                {adminUser.role === 'admin' ? '👑 Admin' : '🛡️ Mod'}
              </span>
            </Link>

            <button
              type="button"
              onClick={onSignOut}
              title="Encerrar sessão administrativa"
              aria-label="Encerrar sessão administrativa"
              className="w-11 h-11 flex items-center justify-center rounded-full text-rose-700 hover:bg-rose-50 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <Link
            to="/admin"
            title="Painel de Moderação"
            className="w-11 h-11 flex items-center justify-center rounded-full text-sage-700 hover:text-sage-900 hover:bg-sage-100 transition-colors">
            <Shield className="w-5 h-5" />
          </Link>
        )}

        {adminUser && adminUser.role !== 'guest' && (
          <Link
            to="/projector"
            title="Abrir Modo Telão"
            className="w-11 h-11 flex items-center justify-center rounded-full text-sage-800/80 hover:text-sage-900 hover:bg-sage-100 transition-colors">
            <Tv className="w-5 h-5" />
          </Link>
        )}
      </div>
    </header>
  )
}
