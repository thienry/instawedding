import { CheckCircle2, Lock, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react'

import { OtpCodeForm } from '@/features/admin/components/OtpCodeForm'
import { OtpEmailForm } from '@/features/admin/components/OtpEmailForm'
import { OTP_LENGTH } from '@/features/admin/constants'
import { useOtpLogin } from '@/features/admin/hooks/useOtpLogin'

interface AdminLoginProps {
  /** Ends any session left in the browser. */
  readonly onClearSessions: () => Promise<void>
}

/** Login gate of the admin area. */
export function AdminLogin({ onClearSessions }: AdminLoginProps) {
  const login = useOtpLogin()
  const { step, email, error, notice, debugCode, setCode, restart } = login

  const handleClearSessions = async () => {
    await onClearSessions()
    restart()
  }

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[75vh] text-center space-y-5 animate-in fade-in duration-200">
      <div className="w-16 h-16 rounded-full bg-sage-100 text-sage-900 flex items-center justify-center mx-auto shadow-xs">
        <Lock className="w-7 h-7 text-sage-800" />
      </div>

      <div className="space-y-1.5">
        <h2 className="font-serif text-2xl font-bold text-sage-900">Acesso Restrito</h2>
        <p className="text-xs text-sage-700 max-w-xs mx-auto">
          {step === 'email'
            ? 'Painel exclusivo para os Noivos (Administração) e Cerimonial (Moderação).'
            : `Digite o código de ${OTP_LENGTH} dígitos enviado para ${email}.`}
        </p>
      </div>

      {error && (
        <div className="w-full max-w-xs p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="w-full max-w-xs p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 text-left">
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

      <div className="w-full max-w-xs space-y-4">
        {step === 'email' ? <OtpEmailForm login={login} /> : <OtpCodeForm login={login} />}

        <div className="pt-3 border-t border-sage-200/80">
          <button
            type="button"
            onClick={() => void handleClearSessions()}
            className="text-[11px] text-sage-700 hover:text-rose-600 transition-colors inline-flex items-center gap-1.5"
            title="Limpar qualquer resquício de sessão antiga do navegador">
            <RefreshCw className="w-3 h-3" />
            <span>Limpar sessões salvas / Deslogar tudo</span>
          </button>
        </div>
      </div>
    </div>
  )
}
