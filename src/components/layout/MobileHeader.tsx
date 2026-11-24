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
              onClick={onSignOut}
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

        {adminUser && adminUser.role !== 'guest' && (
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
  )
}
