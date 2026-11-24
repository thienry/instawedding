import { MockGuestAuthService } from '@/services/mock/mock-guest-auth.service'
import { SupabaseGuestAuthService } from '@/services/supabase/supabase-guest-auth.service'

import type { GuestAuthService } from '@/services/contracts/guest-auth.contract'

let guestAuthInstance: GuestAuthService | null = null

export function getGuestAuthService(): GuestAuthService {
  if (!guestAuthInstance) {
    const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'
    guestAuthInstance = useMocks ? new MockGuestAuthService() : new SupabaseGuestAuthService()
  }
  return guestAuthInstance
}
