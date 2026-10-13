import { buildClearCookieHeader } from '@/api/_lib/security'

export async function POST(): Promise<Response> {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildClearCookieHeader(),
    },
  })
}
