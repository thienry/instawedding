import { createClient } from '@supabase/supabase-js'

import { getGuestSession } from '@/utils/session'

import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const session = getGuestSession()
    client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'x-client-session-id': session.sessionId,
        },
      },
    })
  }
  return client
}
