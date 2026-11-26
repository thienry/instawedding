import { Loader2, Mail } from 'lucide-react'

import { MockLoginShortcuts } from '@/features/admin/components/MockLoginShortcuts'

import type { OtpLogin } from '@/features/admin/hooks/useOtpLogin'

interface OtpEmailFormProps {
  readonly login: OtpLogin
}

/** First login step: asks for the email that receives the code. */
export function OtpEmailForm({ login }: OtpEmailFormProps) {
  const { email, setEmail, isSubmitting, requestCode } = login

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void requestCode(email)
      }}
      className="space-y-3">
      <div className="relative">
        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage-700" />
        <input
          type="email"
          required
          aria-label="E-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu-email@gmail.com"
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-sage-200 bg-white text-base sm:text-sm text-sage-900 placeholder:text-sage-800/40 focus:outline-none focus:ring-2 focus:ring-sage-800/30 transition-all shadow-xs"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 px-4 rounded-2xl bg-sage-800 hover:bg-sage-900 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99]">
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Enviando código...</span>
          </>
        ) : (
          <>
            <Mail className="w-4 h-4" />
            <span>Receber código por e-mail</span>
          </>
        )}
      </button>

      <MockLoginShortcuts onSelect={(target) => void requestCode(target)} />
    </form>
  )
}
