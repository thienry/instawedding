import { KeyRound, Loader2 } from 'lucide-react'

import { OTP_LENGTH } from '@/features/admin/constants'

import type { OtpLogin } from '@/features/admin/hooks/useOtpLogin'

interface OtpCodeFormProps {
  readonly login: OtpLogin
}

/** Second login step: asks for the code received by email. */
export function OtpCodeForm({ login }: OtpCodeFormProps) {
  const { code, setCode, isSubmitting, verifyCode, restart } = login

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void verifyCode()
      }}
      className="space-y-3">
      <div className="space-y-1">
        <input
          type="text"
          inputMode="numeric"
          maxLength={OTP_LENGTH}
          autoFocus
          required
          aria-label="Código de acesso"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={'0'.repeat(OTP_LENGTH)}
          className="w-full px-4 py-3 rounded-2xl border border-sage-200 bg-white text-center font-mono text-xl tracking-[0.4em] font-bold text-sage-900 focus:outline-none focus:ring-2 focus:ring-sage-800/30 transition-all shadow-xs"
        />
        <p className="text-[11px] text-sage-700 text-center">
          Digite os {OTP_LENGTH} dígitos numéricos
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || code.length !== OTP_LENGTH}
        className="w-full py-3.5 px-4 rounded-2xl bg-sage-800 hover:bg-sage-900 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99]">
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verificando...</span>
          </>
        ) : (
          <>
            <KeyRound className="w-4 h-4" />
            <span>Confirmar Código e Entrar</span>
          </>
        )}
      </button>

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={restart}
          className="text-xs text-sage-700 hover:text-sage-900 font-medium transition-colors">
          ← Trocar e-mail ou reenviar código
        </button>
      </div>
    </form>
  )
}
