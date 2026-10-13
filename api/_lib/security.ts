import crypto from 'node:crypto'

const JWT_SECRET =
  process.env.ADMIN_JWT_SECRET ||
  'dev-fallback-secret-change-in-production-instawedding'
const COOKIE_NAME = 'instawedding_admin_token'

export interface AdminTokenPayload {
  role: 'admin'
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
export function createAdminToken(durationSeconds = 86400): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: AdminTokenPayload = {
    role: 'admin',
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
 * Verifies an HMAC-SHA256 signed session token
 */
export function verifyAdminToken(token: string): boolean {
  if (!token || !token.includes('.')) return false

  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) return false

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadB64)
    .digest('base64url')

  if (!timingSafeCompare(signature, expectedSignature)) {
    return false
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    ) as AdminTokenPayload
    const now = Math.floor(Date.now() / 1000)
    return payload.role === 'admin' && payload.exp > now
  } catch {
    return false
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
