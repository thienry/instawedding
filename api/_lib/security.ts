import crypto from 'node:crypto'

const JWT_SECRET =
  process.env.ADMIN_JWT_SECRET ||
  'dev-fallback-secret-change-in-production-instawedding'
const COOKIE_NAME = 'instawedding_admin_token'

export type UserRole = 'admin' | 'moderator'

export interface AdminTokenPayload {
  role: UserRole
  email: string
  name: string
  iat: number
  exp: number
}

/**
 * Constant-time string comparison to prevent timing attack side-channels.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Keep timing uniform even if lengths differ
    crypto.timingSafeEqual(bufA, bufA)
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Creates an HMAC-SHA256 signed session token
 */
export function createAdminToken(
  role: UserRole = 'admin',
  email = 'admin@instawedding.internal',
  name = 'Administrador',
  durationSeconds = 86400
): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: AdminTokenPayload = {
    role,
    email,
    name,
    iat: now,
    exp: now + durationSeconds,
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadB64)
    .digest('base64url')

  return `${payloadB64}.${signature}`
}

/**
 * Verifies an HMAC-SHA256 signed session token and returns the payload or null
 */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
  if (!token || !token.includes('.')) return null

  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) return null

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadB64)
    .digest('base64url')

  if (!timingSafeCompare(signature, expectedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    ) as AdminTokenPayload
    const now = Math.floor(Date.now() / 1000)
    if (
      (payload.role === 'admin' || payload.role === 'moderator') &&
      payload.exp > now
    ) {
      return payload
    }
    return null
  } catch {
    return null
  }
}

/**
 * Extracts the admin token from the Request headers cookie
 */
export function getAdminTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map((c) => c.trim())
  const tokenCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`))
  if (!tokenCookie) return null

  return tokenCookie.split('=')[1] ?? null
}

export function buildSetCookieHeader(token: string, maxAge = 86400): string {
  const isProduction = process.env.NODE_ENV === 'production'
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${
    isProduction ? '; Secure' : ''
  }`
}

export function buildClearCookieHeader(): string {
  const isProduction = process.env.NODE_ENV === 'production'
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${
    isProduction ? '; Secure' : ''
  }`
}

const OTP_COOKIE_NAME = 'instawedding_otp_challenge'

export interface OtpChallengePayload {
  email: string
  codeHash: string
  role: UserRole
  name: string
  exp: number
}

/**
 * Creates an HMAC-signed OTP challenge token valid for 10 minutes (600 seconds)
 */
export function createOtpChallengeToken(
  email: string,
  code: string,
  role: UserRole,
  name: string,
  durationSeconds = 600
): string {
  const now = Math.floor(Date.now() / 1000)
  const codeHash = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${code.trim()}:${email.toLowerCase().trim()}`)
    .digest('hex')

  const payload: OtpChallengePayload = {
    email: email.toLowerCase().trim(),
    codeHash,
    role,
    name,
    exp: now + durationSeconds,
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadB64)
    .digest('base64url')

  return `${payloadB64}.${signature}`
}

/**
 * Validates the user input code against the HMAC-signed OTP challenge token
 */
export function verifyOtpChallenge(
  challengeToken: string,
  email: string,
  inputCode: string
): { valid: boolean; role?: UserRole; name?: string; error?: string } {
  if (!challengeToken || !challengeToken.includes('.')) {
    return { valid: false, error: 'Token de verificação inválido ou ausente.' }
  }

  const [payloadB64, signature] = challengeToken.split('.')
  if (!payloadB64 || !signature) {
    return { valid: false, error: 'Token de verificação corrompido.' }
  }

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadB64)
    .digest('base64url')

  if (!timingSafeCompare(signature, expectedSignature)) {
    return { valid: false, error: 'Assinatura do token inválida.' }
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    ) as OtpChallengePayload

    const now = Math.floor(Date.now() / 1000)
    if (now > payload.exp) {
      return {
        valid: false,
        error: 'Código expirado. Solicite um novo código.',
      }
    }

    if (payload.email !== email.toLowerCase().trim()) {
      return { valid: false, error: 'E-mail divergente do desafio solicitado.' }
    }

    const inputHash = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${inputCode.trim()}:${email.toLowerCase().trim()}`)
      .digest('hex')

    if (!timingSafeCompare(inputHash, payload.codeHash)) {
      return {
        valid: false,
        error: 'Código incorreto. Verifique e tente novamente.',
      }
    }

    return { valid: true, role: payload.role, name: payload.name }
  } catch {
    return {
      valid: false,
      error: 'Falha ao processar desafio de autenticação.',
    }
  }
}

export function getOtpTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map((c) => c.trim())
  const tokenCookie = cookies.find((c) => c.startsWith(`${OTP_COOKIE_NAME}=`))
  if (!tokenCookie) return null

  return tokenCookie.split('=')[1] ?? null
}

export function buildSetOtpCookieHeader(token: string, maxAge = 600): string {
  const isProduction = process.env.NODE_ENV === 'production'
  return `${OTP_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${
    isProduction ? '; Secure' : ''
  }`
}

export function buildClearOtpCookieHeader(): string {
  const isProduction = process.env.NODE_ENV === 'production'
  return `${OTP_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${
    isProduction ? '; Secure' : ''
  }`
}
