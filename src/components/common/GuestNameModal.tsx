import {
  Loader2,
  LogOut,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useState } from 'react'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { getGuestAuthService } from '@/services/guest-auth.factory'

import type { GuestUser } from '@/types/domain'

interface GuestNameModalProps {
  readonly isOpen: boolean
  readonly guestUser?: GuestUser | null
  readonly reasonMessage?: string
  readonly redirectPath?: string
  readonly onClose: () => void
  readonly onAuthChanged?: (user: GuestUser | null) => void
}

export function GuestNameModal({
  isOpen,
  guestUser = null,
  reasonMessage,
  redirectPath,
  onClose,
  onAuthChanged,
}: GuestNameModalProps) {
  const guestAuth = getGuestAuthService()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleGoogleSignIn = async () => {
    setError('')
    setIsLoading(true)

    try {
      const result = await guestAuth.signInWithGoogle(redirectPath)
      if (!result.success) {
        setError(
          result.message || 'Não foi possível autenticar com o Google.'
        )
        setIsLoading(false)
        return
      }
      if (result.user) {
        onAuthChanged?.(result.user)
        onClose()
      }
    } catch {
      setError('Erro inesperado ao conectar com o Google. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await guestAuth.logout()
      onAuthChanged?.(null)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-sage-200 space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar janela"
          className="absolute top-4 right-4 p-2 rounded-full text-sage-800/60 hover:text-sage-900 hover:bg-sage-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {guestUser ? (
          <div className="space-y-5">
            <div className="text-center space-y-2 pt-1">
              <div className="flex justify-center">
                <AuthorAvatar
                  name={guestUser.name}
                  avatarUrl={guestUser.avatarUrl}
                  sizeClassName="w-18 h-18 text-xl"
                />
              </div>
              <div>
                <h2
                  id="guest-auth-modal-title"
                  className="font-serif text-xl font-bold text-sage-900"
                >
                  {guestUser.name}
                </h2>
                <p className="text-xs sm:text-sm text-sage-800/70">
                  {guestUser.email}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Conta Google conectada</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-sage-800/75 text-center leading-relaxed">
              Suas fotos e curtidas no mural aparecerão assinadas com seu nome
              e foto de perfil do Google.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl bg-sage-100 hover:bg-sage-200 text-sage-900 font-semibold text-sm transition-colors"
              >
                Continuar no Mural
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-sm transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center space-y-2 pt-1">
              <img
                src="/favicon.svg"
                alt="Logo Thiago & Priscila"
                className="w-13 h-13 rounded-2xl mx-auto shadow-xs"
              />
              <h2
                id="guest-auth-modal-title"
                className="font-serif text-2xl font-bold text-sage-900"
              >
                Entre com sua Conta Google
              </h2>
              <p className="text-xs sm:text-sm text-sage-800/75 leading-relaxed">
                {reasonMessage ||
                  'Para curtir registros ou publicar fotos no mural dos noivos, conecte sua conta Google. Seu nome e foto de perfil serão usados automaticamente.'}
              </p>
            </div>

            {error && (
              <p className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-2xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-3 active:scale-[0.99]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg
                  className="w-5 h-5 shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-2 3l3.2 2.5c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2.1H12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1l-3.3 2.6C4.8 19.9 8.1 22 12 22z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.4 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L3.1 7.5C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.5l3.3-2.6z"
                  />
                  <path
                    fill="#4285F4"
                    d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 2.9 14.7 2 12 2 8.1 2 4.8 4.1 3.1 7.5l3.3 2.6c.8-2.3 3-4.2 5.6-4.2z"
                  />
                </svg>
              )}
              <span>Continuar com Google</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
