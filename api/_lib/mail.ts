import process from 'node:process'

import nodemailer from 'nodemailer'

import { isDeployed } from './security.js'

function otpEmailHtml(code: string): string {
  return `
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
  `
}

/**
 * Sends the login code through Gmail SMTP, with an app password.
 * Without credentials, local development logs the code instead.
 */
export async function sendOtpEmail(email: string, code: string): Promise<boolean> {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    if (isDeployed()) {
      console.error('[mail] GMAIL_USER or GMAIL_APP_PASSWORD is not configured')
      return false
    }
    console.info(`[mail] To: ${email} | Code: ${code} (Gmail not configured)`)
    return true
  }

  try {
    const transport = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
    await transport.sendMail({
      from: { name: 'InstaWedding T&P', address: user },
      to: email,
      subject: `Seu código de acesso InstaWedding: ${code}`,
      text: `Seu código de acesso é ${code}. Ele expira em 10 minutos.`,
      html: otpEmailHtml(code),
    })
    return true
  } catch (error) {
    console.error('[mail]', error instanceof Error ? error.message : error)
    return false
  }
}
