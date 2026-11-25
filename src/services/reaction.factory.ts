import { MockReactionService } from '@/services/mock/mock-reaction.service'
import { SupabaseReactionService } from '@/services/supabase/supabase-reaction.service'

import type { ReactionService } from '@/services/contracts/reaction.contract'

let instance: ReactionService | null = null

export function getReactionService(): ReactionService {
  instance ??=
    import.meta.env.VITE_USE_MOCKS !== 'false'
      ? new MockReactionService()
      : new SupabaseReactionService()
  return instance
}
