import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { GoogleIcon } from '@/components/common/GoogleIcon'
import { OtpCodeForm } from '@/features/admin/components/OtpCodeForm'
import { OtpEmailForm } from '@/features/admin/components/OtpEmailForm'
import { OTP_LENGTH } from '@/features/admin/constants'
import { useOtpLogin } from '@/features/admin/hooks/useOtpLogin'
import { useGuestAuth } from '@/hooks/useGuestAuth'

interface AdminLoginProps {
  /** Ends any session left in the browser. */
  readonly onClearSessions: () => Promise<void>
}

/** Login gate of the admin area. */
export function AdminLogin({ onClearSessions }: AdminLoginProps) {
  const login = useOtpLogin()
  const { step, email, error, notice, debugCode, setCode, restart } = login
  const { isSigningIn, signIn } = useGuestAuth()
  const [googleError, setGoogleError] = useState('')

  // Returns to /admin, where the session picks up the Google account
  const handleGoogle = async () => {
    setGoogleError('')
    const result = await signIn('/admin')
    if (!result.success) setGoogleError(result.message || 'Não foi possível entrar com o Google.')
  }

  const handleClearSessions = async () => {
    await onClearSessions()
    restart()
  }

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[70dvh] text-center space-y-5 animate-in fade-in duration-200">
      <div className="w-16 h-16 rounded-full bg-sage-100 text-sage-900 flex items-center justify-center mx-auto shadow-xs">
        <Lock className="w-7 h-7 text-sage-800" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h2 className="font-serif text-2xl font-bold text-sage-900">
          Área dos noivos e do cerimonial
        </h2>
        <p className="text-sm text-sage-800">
          {step === 'email'
            ? 'Entre com o e-mail que os noivos cadastraram para receber um código de acesso.'
            : `Digite o código de ${OTP_LENGTH} dígitos enviado para ${email}. Confira também o spam.`}
        </p>
      </div>

      {step === 'email' && (
        <div className="w-full max-w-sm p-4 rounded-2xl bg-gold-400/15 border border-gold-400/35 text-left space-y-3">
          <p className="text-sm text-sage-900">
            <span className="font-bold">É convidado?</span> Esta área não é para você. Suas fotos e
            recados vão pelo mural.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-full bg-sage-900 hover:bg-sage-800 text-white text-sm font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao mural</span>
          </Link>
        </div>
      )}

      {(error || googleError) && (
        <div className="w-full max-w-sm p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2 text-left">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error || googleError}</span>
        </div>
      )}

      {notice && (
        <div className="w-full max-w-sm p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 text-left">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {debugCode && (
        <div className="w-full max-w-xs p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ambiente de Teste (Código OTP):</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-base font-extrabold tracking-widest text-amber-950">
              {debugCode}
            </span>
            <button
              type="button"
              onClick={() => setCode(debugCode)}
              className="px-2 py-0.5 rounded-md bg-amber-200 hover:bg-amber-300 text-[11px] font-bold text-amber-900 transition-colors">
              Preencher
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm space-y-4">
        {step === 'email' ? <OtpEmailForm login={login} /> : <OtpCodeForm login={login} />}

        {step === 'email' && (
          <div className="space-y-2">
            <p className="text-xs text-sage-700">ou, se o e-mail cadastrado for uma conta Google</p>
            <button
              type="button"
              disabled={isSigningIn}
              onClick={() => void handleGoogle()}
              className="w-full py-3.5 px-4 rounded-2xl bg-white border border-sage-200 hover:bg-sage-50 disabled:opacity-60 text-sage-900 text-sm font-semibold flex items-center justify-center gap-3 transition-all shadow-xs active:scale-[0.99]">
              {isSigningIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
              <span>{isSigningIn ? 'Redirecionando...' : 'Entrar com Google'}</span>
            </button>
          </div>
        )}

        <div className="pt-3 border-t border-sage-200/80">
          <button
            type="button"
            onClick={() => void handleClearSessions()}
            className="text-[11px] text-sage-700 hover:text-rose-600 transition-colors inline-flex items-center min-h-11 gap-1.5"
            title="Limpar qualquer resquício de sessão antiga do navegador">
            <RefreshCw className="w-3 h-3" />
            <span>Limpar sessões salvas / Deslogar tudo</span>
          </button>
        </div>
      </div>
    </div>
  )
}
