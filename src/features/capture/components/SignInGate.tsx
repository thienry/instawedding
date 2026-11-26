import { AlertCircle, Loader2 } from 'lucide-react'

import { GoogleIcon } from '@/components/common/GoogleIcon'

interface SignInGateProps {
  readonly isSigningIn: boolean
  readonly errorMessage: string
  readonly onSignIn: () => void
}

/** Login required before posting. */
export function SignInGate({ isSigningIn, errorMessage, onSignIn }: SignInGateProps) {
  return (
    <div className="w-full max-w-xl m-auto space-y-5">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-sage-200/90 text-center space-y-5 shadow-xs">
        <img
          src="/favicon.svg"
          alt="Logo Thiago & Priscila"
          className="w-16 h-16 rounded-2xl mx-auto shadow-xs"
        />
        <div className="space-y-2">
          <h3 className="font-serif text-2xl font-bold text-sage-900">Entre para Postar</h3>
          <p className="text-sm text-sage-700 max-w-md mx-auto leading-relaxed">
            Conecte sua conta Google para enviar fotos e vídeos ao mural e telão ao vivo. Sua foto
            de perfil e nome serão usados automaticamente na assinatura!
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
          {isSigningIn ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : <GoogleIcon />}
          <span>{isSigningIn ? 'Redirecionando...' : 'Continuar com Google'}</span>
        </button>
      </div>
    </div>
  )
}
