import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

import {
  buildClearOtpCookieHeader,
  buildSetCookieHeader,
  buildSetOtpCookieHeader,
  createAdminToken,
  createOtpChallengeToken,
  getOtpTokenFromRequest,
  verifyOtpChallenge,
} from '../_lib/security.js'

import type { UserRole } from '../_lib/security.js'

interface OtpRequestBody {
  action: 'request' | 'verify'
  email?: string
  code?: string
  challengeToken?: string
}

async function resolveUserRole(
  email: string
): Promise<{ role: UserRole; name: string } | null> {
  const normalizedEmail = email.toLowerCase().trim()

  const masterAdminEmail = (
    process.env.ADMIN_EMAILS ||
    process.env.VITE_ADMIN_EMAILS ||
    'thmoura14@gmail.com'
  )
    .toLowerCase()
    .split(',')[0]
    .trim() || 'thmoura14@gmail.com'

  if (normalizedEmail === masterAdminEmail) {
    return { role: 'admin', name: 'Thiago (Admin Master)' }
  }

  // Check ceremonialists table in Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY

  if (supabaseUrl && serviceRoleKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      })
      const { data } = await supabaseAdmin
        .from('ceremonialists')
        .select('name')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (data) {
        return {
          role: 'moderator',
          name: data.name?.trim() ? `${data.name.trim()} (Cerimonial)` : 'Equipe Cerimonial',
        }
      }
    } catch {
      // Supabase query error fallback
    }
  }

  const modEmails = (
    process.env.MODERATOR_EMAILS ||
    process.env.VITE_MODERATOR_EMAILS ||
    ''
  )
    .toLowerCase()
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  if (modEmails.includes(normalizedEmail)) {
    const username = normalizedEmail.split('@')[0]
    const capitalized = username.charAt(0).toUpperCase() + username.slice(1)
    return { role: 'moderator', name: `${capitalized} (Cerimonial)` }
  }

  return null
}

async function sendEmailViaResend(
  email: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Development or self-hosted fallback: log code to server stdout
    console.info(
      `[InstaWedding OTP Serverless] To: ${email} | Code: ${code} (RESEND_API_KEY not configured)`
    )
    return { ok: true }
  }

  const fromEmail =
    process.env.RESEND_FROM_EMAIL || 'InstaWedding <onboarding@resend.dev>'

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

export async function POST(req: Request): Promise<Response> {
  let body: OtpRequestBody
  try {
    body = (await req.json()) as OtpRequestBody
  } catch {
    return new Response(
      JSON.stringify({ error: 'Corpo da requisição inválido.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

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
    const userRoleInfo = await resolveUserRole(normalizedEmail)

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
          error:
            'Falha ao enviar o e-mail com o código de acesso. Tente novamente.',
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const isDev = process.env.NODE_ENV !== 'production'
    const cookieHeader = buildSetOtpCookieHeader(challengeToken, 600)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Código de 6 dígitos enviado com sucesso para seu e-mail.',
        debugCode: isDev || !process.env.RESEND_API_KEY ? code : undefined,
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
          error:
            'Desafio de verificação não encontrado ou expirado. Solicite um novo código.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const verification = verifyOtpChallenge(
      challengeToken,
      normalizedEmail,
      code.trim()
    )

    if (!verification.valid || !verification.role || !verification.name) {
      return new Response(
        JSON.stringify({
          error: verification.error || 'Código incorreto ou expirado.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create session token (valid for 24 hours)
    const adminToken = createAdminToken(
      verification.role,
      normalizedEmail,
      verification.name
    )

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
