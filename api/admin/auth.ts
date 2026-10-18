import { getAdminTokenFromRequest, verifyAdminToken } from '../_lib/security.js'

export async function POST(): Promise<Response> {
  return new Response(
    JSON.stringify({
      error:
        'A autenticação via PIN foi descontinuada e desativada por segurança. Utilize o login seguro via Google OAuth.',
    }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        Allow: 'GET',
      },
    }
  )
}

export async function GET(req: Request): Promise<Response> {
  const token = getAdminTokenFromRequest(req)
  const payload = token ? verifyAdminToken(token) : null

  if (!payload) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      user: {
        email: payload.email,
        name: payload.name,
        role: payload.role,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
