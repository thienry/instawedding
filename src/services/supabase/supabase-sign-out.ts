import { AUTH_STORAGE_KEY } from '@/services/supabase/auth-storage-key'
import { getSupabaseClient } from '@/services/supabase/supabase.client'

/**
 * Ends the Google session of this device only. Without network, forgets it
 * here: an expired session would otherwise stay and come back later.
 */
export async function signOutLocally(): Promise<void> {
  const { auth } = getSupabaseClient()
  if (navigator.onLine) {
    // The default would also end the sessions of the other devices
    const { error } = await auth.signOut({ scope: 'local' })
    if (!error) return
  }
  localStorage.removeItem(AUTH_STORAGE_KEY)
  // Without a stored session, this only announces the end
  await auth.signOut({ scope: 'local' })
}
