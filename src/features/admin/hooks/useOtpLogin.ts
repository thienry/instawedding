import { useState } from 'react'

import { OTP_LENGTH } from '@/features/admin/constants'
import { getAdminAuthService } from '@/services/admin-auth.factory'

/** State and actions of the two-step login, as returned by {@link useOtpLogin}. */
export interface OtpLogin {
  readonly step: 'email' | 'code'
  readonly email: string
  readonly setEmail: (email: string) => void
  readonly code: string
  /** Stores the code, dropping non-digits and any excess. */
  readonly setCode: (code: string) => void
  readonly error: string
  readonly notice: string
  /** Code exposed by the mock service; `null` with a real email login. */
  readonly debugCode: string | null
  readonly isSubmitting: boolean
  /** Sends a code to `targetEmail` and moves to the code step. */
  readonly requestCode: (targetEmail: string) => Promise<void>
  /** Verifies the typed code. The session hook picks up the signed-in user. */
  readonly verifyCode: () => Promise<void>
  /** Returns to the email step, keeping the typed email. */
  readonly restart: () => void
}

/** Drives the admin login: request a code by email, then verify it. */
export function useOtpLogin(): OtpLogin {
  const [step, setStep] = useState<OtpLogin['step']>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [debugCode, setDebugCode] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const authService = getAdminAuthService()

  const requestCode = async (targetEmail: string) => {
    const normalizedEmail = targetEmail.trim().toLowerCase()
    setError('')
    setNotice('')
    setIsSubmitting(true)

    const result = await authService.requestOtp(normalizedEmail)
    setIsSubmitting(false)

    if (!result.success) {
      setError(
        result.message || 'Falha ao solicitar código. Verifique se o e-mail está cadastrado.'
      )
      return
    }

    setEmail(normalizedEmail)
    setStep('code')
    setNotice(result.message || 'Código de 6 dígitos enviado para seu e-mail!')
    setDebugCode(result.debugCode ?? null)
  }

  const verifyCode = async () => {
    setError('')
    setIsSubmitting(true)

    const result = await authService.verifyOtp(email, code)
    setIsSubmitting(false)

    if (!result.success) {
      setError(result.message || 'Código incorreto ou expirado. Tente novamente.')
    }
  }

  const restart = () => {
    setStep('email')
    setCode('')
    setError('')
    setNotice('')
    setDebugCode(null)
  }

  return {
    step,
    email,
    setEmail,
    code,
    setCode: (value) => setCode(value.replace(/\D/g, '').slice(0, OTP_LENGTH)),
    error,
    notice,
    debugCode,
    isSubmitting,
    requestCode,
    verifyCode,
    restart,
  }
}
