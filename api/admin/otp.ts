import crypto from 'node:crypto'

import { resolveUserRole } from '../_lib/auth.js'
import { fail, getClientIp, readJson } from '../_lib/http.js'
import { sendOtpEmail } from '../_lib/mail.js'
import { withinRateLimit } from '../_lib/rate-limit.js'
import {
  buildClearOtpCookieHeader,
  buildSetCookieHeader,
  buildSetOtpCookieHeader,
  createAdminToken,
  createOtpChallengeToken,
  getOtpTokenFromRequest,
  isDeployed,
  verifyOtpChallenge,
} from '../_lib/security.js'

interface OtpRequestBody {
  action: 'request' | 'verify'
  email?: string
  code?: string
  challengeToken?: string
}

const OTP_WINDOW_SECONDS = 600

// Fails closed on deployments. Local development works without a database.
async function checkLimit(scope: string, subject: string, max: number): Promise<boolean> {
  try {
    return await withinRateLimit(scope, subject, max, OTP_WINDOW_SECONDS)
  } catch (err) {
    console.error('[otp]', err)
    return !isDeployed()
  }
}

function tooManyAttempts(): Response {
  return new Response(
    JSON.stringify({
      error: 'Muitas tentativas. Aguarde 10 minutos e solicite um novo código.',
    }),
    { status: 429, headers: { 'Content-Type': 'application/json' } }
  )
}

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<OtpRequestBody>(req)
  if (!body) return fail(400, 'Corpo da requisição inválido.')

  const { action, email } = body

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return new Response(
      JSON.stringify({
        error: 'Por favor, informe um endereço de e-mail válido.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const normalizedEmail = email.toLowerCase().trim()

  // 1. SOLICITAÇÃO DE OTP
  if (action === 'request') {
    const allowed =
      (await checkLimit('otp-ip', getClientIp(req), 10)) &&
      (await checkLimit('otp-email-ip', `${normalizedEmail}|${getClientIp(req)}`, 5)) &&
      // Higher, so one person cannot block the codes of another
      (await checkLimit('otp-email', normalizedEmail, 15))
    if (!allowed) return tooManyAttempts()

    let userRoleInfo
    try {
      userRoleInfo = await resolveUserRole(normalizedEmail)
    } catch (error) {
      console.error('[otp]', error)
      return fail(503, 'Serviço indisponível no momento. Tente novamente.')
    }

    // Generate secure 6-digit cryptographic code
    const code = crypto.randomInt(100000, 1000000).toString()

    // The same answer for every email, so nobody learns which ones have access.
    // Anyone can read the token, so the role is only resolved on verification.
    const challengeToken = createOtpChallengeToken(
      normalizedEmail,
      code,
      'moderator',
      'Cerimonial',
      600
    )

    const sent = userRoleInfo ? await sendOtpEmail(normalizedEmail, code) : true
    if (!sent) {
      return new Response(
        JSON.stringify({
          error: 'Falha ao enviar o e-mail com o código de acesso. Tente novamente.',
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const cookieHeader = buildSetOtpCookieHeader(challengeToken, 600)

    return new Response(
      JSON.stringify({
        success: true,
        message:
          'Se este e-mail tiver acesso ao painel, o código de 6 dígitos chegará em instantes.',
        debugCode: isDeployed() || !userRoleInfo ? undefined : code,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
        },
      }
    )
  }

  // 2. VERIFICAÇÃO DE OTP
  if (action === 'verify') {
    const { code } = body

    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      return new Response(
        JSON.stringify({
          error: 'O código informado deve conter exatamente 6 dígitos.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const challengeToken = body.challengeToken || getOtpTokenFromRequest(req)

    if (!challengeToken) {
      return new Response(
        JSON.stringify({
          error: 'Desafio de verificação não encontrado ou expirado. Solicite um novo código.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // The signature identifies the challenge; the code has 10 minutes to live
    const challengeId = challengeToken.split('.')[1] ?? ''
    const allowed =
      (await checkLimit('otp-verify-ip', getClientIp(req), 30)) &&
      (await checkLimit('otp-verify', challengeId, 5))
    if (!allowed) return tooManyAttempts()

    const verification = verifyOtpChallenge(challengeToken, normalizedEmail, code.trim())

    if (!verification.valid) {
      return new Response(
        JSON.stringify({
          error: verification.error || 'Código incorreto ou expirado.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Each code works only once
    if (!(await checkLimit('otp-used', challengeId, 1))) {
      return tooManyAttempts()
    }

    let user
    try {
      user = await resolveUserRole(normalizedEmail)
    } catch (error) {
      console.error('[otp]', error)
      return fail(503, 'Serviço indisponível no momento. Solicite um novo código.')
    }
    if (!user) return fail(401, 'Código incorreto ou expirado.')

    // Create session token (valid for 24 hours)
    const adminToken = createAdminToken(user.role, normalizedEmail, user.name)

    const sessionCookie = buildSetCookieHeader(adminToken)
    const clearOtpCookie = buildClearOtpCookieHeader()

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.append('Set-Cookie', sessionCookie)
    headers.append('Set-Cookie', clearOtpCookie)

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          email: normalizedEmail,
          name: user.name,
          role: user.role,
        },
      }),
      {
        status: 200,
        headers,
      }
    )
  }

  return new Response(JSON.stringify({ error: 'Ação não suportada.' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
}
