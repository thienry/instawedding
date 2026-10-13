import {
  buildSetCookieHeader,
  createAdminToken,
  getAdminTokenFromRequest,
  timingSafeCompare,
  verifyAdminToken,
} from '@/api/_lib/security'

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { pin?: string }
    const configuredPin = process.env.ADMIN_PIN || '2026'

    if (!body?.pin || typeof body.pin !== 'string') {
      return new Response(JSON.stringify({ error: 'PIN é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const isValid = timingSafeCompare(body.pin, configuredPin)
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'PIN incorreto' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const token = createAdminToken()
    const cookieHeader = buildSetCookieHeader(token)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal Server Error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function GET(req: Request): Promise<Response> {
  const token = getAdminTokenFromRequest(req)
  if (!token || !verifyAdminToken(token)) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ authenticated: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
