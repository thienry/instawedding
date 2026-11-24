export function json(
  body: unknown,
  status = 200,
  headers?: HeadersInit
): Response {
  return Response.json(body, { status, headers })
}

export const fail = (status: number, error: string): Response =>
  json({ error }, status)

export async function readJson<T>(req: Request): Promise<Partial<T> | null> {
  try {
    const body: unknown = await req.json()
    return body && typeof body === 'object' ? (body as Partial<T>) : null
  } catch {
    return null
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]
  return (req.headers.get('x-real-ip') ?? forwarded ?? 'unknown').trim()
}
