import crypto from 'node:crypto'
import process from 'node:process'

import { resolveUserRole } from '../_lib/auth.js'
import { fail, getClientIp, readJson } from '../_lib/http.js'
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

async function sendEmailViaResend(
  email: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (isDeployed()) return { ok: false, error: 'Missing RESEND_API_KEY' }
    // Development or self-hosted fallback: log code to server stdout
    console.info(
      `[InstaWedding OTP Serverless] To: ${email} | Code: ${code} (RESEND_API_KEY not configured)`
    )
    return { ok: true }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'InstaWedding <onboarding@resend.dev>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `Seu código de acesso InstaWedding: ${code}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px; background-color: #faf9f6; border-radius: 24px; color: #1e2923;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 28px;">💍</span>
              <h2 style="margin: 8px 0 4px; font-size: 22px; color: #1e2923; font-weight: 700;">InstaWedding</h2>
              <p style="margin: 0; font-size: 13px; color: #526359;">Painel Administrativo & Cerimonial</p>
            </div>
            
            <div style="background-color: #ffffff; border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #e2e8e3;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">Use o código descartável abaixo para confirmar seu acesso:</p>
              
              <div style="background-color: #f0f4f1; border-radius: 12px; padding: 14px 20px; display: inline-block; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #1b4332; font-family: monospace;">
                ${code}
              </div>
              
              <p style="margin: 16px 0 0; font-size: 12px; color: #718096;">
                Este código expira em <strong>10 minutos</strong>. Nunca compartilhe este código com ninguém.
              </p>
            </div>
            
            <p style="text-align: center; margin-top: 24px; font-size: 11px; color: #9ca3af;">
              Se você não solicitou este código, ignore esta mensagem com segurança.
            </p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[Resend Error]', errText)
      return { ok: false, error: errText }
    }

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Resend error'
    console.error('[Resend Exception]', message)
    return { ok: false, error: message }
  }
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
      (await checkLimit('otp-email', normalizedEmail, 5))
    if (!allowed) return tooManyAttempts()

    let userRoleInfo
    try {
      userRoleInfo = await resolveUserRole(normalizedEmail)
    } catch (error) {
      console.error('[otp]', error)
      return fail(503, 'Serviço indisponível no momento. Tente novamente.')
    }

    if (!userRoleInfo) {
      return new Response(
        JSON.stringify({
          error:
            'Acesso negado: este e-mail não possui permissão pré-cadastrada no painel administrativo.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate secure 6-digit cryptographic code
    const code = crypto.randomInt(100000, 1000000).toString()

    const challengeToken = createOtpChallengeToken(
      normalizedEmail,
      code,
      userRoleInfo.role,
      userRoleInfo.name,
      600
    )

    const dispatchResult = await sendEmailViaResend(normalizedEmail, code)
    if (!dispatchResult.ok) {
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
        message: 'Código de 6 dígitos enviado com sucesso para seu e-mail.',
        debugCode: isDeployed() ? undefined : code,
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

    if (!verification.valid || !verification.role || !verification.name) {
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

    // Create session token (valid for 24 hours)
    const adminToken = createAdminToken(verification.role, normalizedEmail, verification.name)

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
          name: verification.name,
          role: verification.role,
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
