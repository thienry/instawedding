import crypto from 'node:crypto'

import { createServiceClient } from './supabase.js'

/** Counts one hit. Throws when the limiter is unavailable. */
export async function withinRateLimit(
  scope: string,
  subject: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  // Hashed so emails, IPs and tokens are not stored.
  const digest = crypto.createHash('sha256').update(subject).digest('hex')
  const { data, error } = await createServiceClient().rpc(
    'consume_rate_limit',
    {
      p_key: `${scope}:${digest}`,
      p_max: max,
      p_window_seconds: windowSeconds,
    }
  )
  if (error) throw new Error(`Rate limiter failed: ${error.message}`)
  return data === true
}
