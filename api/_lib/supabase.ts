import process from 'node:process'

import { createClient, isAuthRetryableFetchError } from '@supabase/supabase-js'

import type { SupabaseClient, User } from '@supabase/supabase-js'

/** Server client that bypasses RLS. Never falls back to the public key. */
export function createServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase server key is not configured')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Returns the Supabase Auth user of the bearer token, validated by Supabase.
 * Throws when Supabase is unreachable, which says nothing about the token.
 */
export async function getBearerUser(req: Request): Promise<User | null> {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return null
  const { data, error } = await createServiceClient().auth.getUser(token)
  if (isAuthRetryableFetchError(error)) throw error
  return error ? null : data.user
}
