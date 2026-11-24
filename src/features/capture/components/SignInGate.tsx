import { AlertCircle, Loader2 } from 'lucide-react'

interface SignInGateProps {
  readonly isSigningIn: boolean
  readonly errorMessage: string
  readonly onSignIn: () => void
}

/** Login required before posting. */
export function SignInGate({ isSigningIn, errorMessage, onSignIn }: SignInGateProps) {
  return (
    <div className="max-w-xl mx-auto space-y-5 pt-2">
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-sage-200/90 text-center space-y-5 shadow-xs">
        <img
          src="/favicon.svg"
          alt="Logo Thiago & Priscila"
          className="w-16 h-16 rounded-2xl mx-auto shadow-xs"
        />
        <div className="space-y-2">
          <h3 className="font-serif text-2xl font-bold text-sage-900">Entre para Postar Fotos</h3>
          <p className="text-sm text-sage-700 max-w-md mx-auto leading-relaxed">
            Conecte sua conta Google para enviar fotos ao mural e telão ao vivo. Sua foto de perfil
            e nome serão usados automaticamente na assinatura!
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center gap-2 text-rose-700 text-xs sm:text-sm max-w-xs mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="button"
          disabled={isSigningIn}
          onClick={onSignIn}
          className="w-full max-w-xs mx-auto py-3.5 px-5 rounded-2xl bg-sage-900 hover:bg-sage-800 disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-3 active:scale-[0.99]">
          {isSigningIn ? (
            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
          <span>{isSigningIn ? 'Redirecionando...' : 'Continuar com Google'}</span>
        </button>
      </div>
    </div>
  )
}
