import { ArrowLeft, LogOut, ShieldCheck, Tv } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'

interface AdminTopBarProps {
  readonly currentUser: AdminUser
  readonly onSignOut: () => Promise<void>
}

/** Signed-in user, sign-out and shortcuts to the feed and the projector. */
export function AdminTopBar({ currentUser, onSignOut }: AdminTopBarProps) {
  const navigate = useNavigate()
  const isAdmin = currentUser.role === 'admin'

  return (
    <>
      <div className="bg-white rounded-3xl p-5 border border-sage-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 min-w-0">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-12 h-12 rounded-full border border-sage-200 object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-sage-100 text-sage-900 font-bold flex items-center justify-center border border-sage-200 text-base shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-sage-900 leading-tight truncate">
                {currentUser.name}
              </h3>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-md shrink-0 ${
                  isAdmin
                    ? 'bg-gold-500/20 text-gold-500'
                    : 'bg-sage-200 text-sage-800'
                }`}
              >
                {isAdmin ? '👑 Admin' : '🛡️ Moderador'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-sage-800/65 leading-tight truncate mt-0.5">
              {currentUser.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onSignOut()}
          title="Encerrar sessão e deslogar"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold border border-rose-200 transition-colors shadow-2xs shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-sage-200 text-sm text-sage-800 hover:text-sage-900 hover:bg-sage-100 transition-colors font-semibold shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para o Feed</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/projector')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-sage-900 hover:bg-sage-800 text-sm text-white transition-colors font-semibold shadow-2xs"
          >
            <Tv className="w-4 h-4 text-gold-400" />
            <span>Abrir Modo Telão</span>
          </button>
        </div>

        <span className="text-xs sm:text-sm text-sage-800/75 flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Sessão Administrativa Segura</span>
        </span>
      </div>
    </>
  )
}
