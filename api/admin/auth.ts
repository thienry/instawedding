import { authorize } from '../_lib/auth.js'
import { json } from '../_lib/http.js'

export async function GET(req: Request): Promise<Response> {
  const user = await authorize(req)
  return json(user ? { authenticated: true, user } : { authenticated: false }, 200, {
    'Cache-Control': 'no-store',
  })
}
