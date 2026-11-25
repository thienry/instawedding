import { createClient } from '@supabase/supabase-js'

import { AUTH_STORAGE_KEY, SUPABASE_URL } from '@/services/supabase/auth-storage-key'
import { getGuestSession } from '@/utils/session'

import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const session = getGuestSession()
    client = createClient(SUPABASE_URL, supabaseAnonKey, {
      auth: { storageKey: AUTH_STORAGE_KEY },
      global: {
        headers: {
          'x-client-session-id': session.sessionId,
        },
      },
    })
  }
  return client
}
