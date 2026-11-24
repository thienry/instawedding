import { authorize } from '../_lib/auth.js'
import { fail, json } from '../_lib/http.js'

export async function GET(req: Request): Promise<Response> {
  let user
  try {
    user = await authorize(req)
  } catch (error) {
    console.error('[auth]', error)
    return fail(503, 'Serviço indisponível no momento. Tente novamente.')
  }
  return json(user ? { authenticated: true, user } : { authenticated: false }, 200, {
    'Cache-Control': 'no-store',
  })
}
