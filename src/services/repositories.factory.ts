import { ApiBannedTermRepository } from '@/services/api/api-banned-term.repository'
import { MockBannedTermRepository } from '@/services/mock/mock-banned-term.repository'
import { MockCeremonialistRepository } from '@/services/mock/mock-ceremonialist.repository'
import { MockChallengeRepository } from '@/services/mock/mock-challenge.repository'
import { MockPostRepository } from '@/services/mock/mock-post.repository'
import { MockRealtimeService } from '@/services/mock/mock-realtime.service'
import { SupabaseCeremonialistRepository } from '@/services/supabase/supabase-ceremonialist.repository'
import { SupabaseChallengeRepository } from '@/services/supabase/supabase-challenge.repository'
import { SupabasePostRepository } from '@/services/supabase/supabase-post.repository'
import { SupabaseRealtimeService } from '@/services/supabase/supabase-realtime.service'

import type { BannedTermRepository } from '@/services/contracts/banned-term-repository.contract'
import type { CeremonialistRepository } from '@/services/contracts/ceremonialist-repository.contract'
import type { ChallengeRepository } from '@/services/contracts/challenge-repository.contract'
import type { PostRepository } from '@/services/contracts/post-repository.contract'
import type { RealtimeService } from '@/services/contracts/realtime.contract'

const isMockEnabled = import.meta.env.VITE_USE_MOCKS !== 'false'

let challengeRepoInstance: ChallengeRepository | null = null
let realtimeServiceInstance: RealtimeService | null = null
let postRepoInstance: PostRepository | null = null
let ceremonialistRepoInstance: CeremonialistRepository | null = null
let bannedTermRepoInstance: BannedTermRepository | null = null

export function getBannedTermRepository(): BannedTermRepository {
  if (!bannedTermRepoInstance) {
    bannedTermRepoInstance = isMockEnabled
      ? new MockBannedTermRepository()
      : new ApiBannedTermRepository()
  }
  return bannedTermRepoInstance
}

export function getCeremonialistRepository(): CeremonialistRepository {
  if (!ceremonialistRepoInstance) {
    ceremonialistRepoInstance = isMockEnabled
      ? new MockCeremonialistRepository()
      : new SupabaseCeremonialistRepository()
  }
  return ceremonialistRepoInstance
}

export function getChallengeRepository(): ChallengeRepository {
  if (!challengeRepoInstance) {
    challengeRepoInstance = isMockEnabled
      ? new MockChallengeRepository()
      : new SupabaseChallengeRepository()
  }
  return challengeRepoInstance
}

export function getRealtimeService(): RealtimeService {
  if (!realtimeServiceInstance) {
    realtimeServiceInstance = isMockEnabled
      ? new MockRealtimeService()
      : new SupabaseRealtimeService()
  }
  return realtimeServiceInstance
}

export function getPostRepository(): PostRepository {
  if (!postRepoInstance) {
    const challengeRepo = getChallengeRepository()
    const realtimeService = getRealtimeService()

    postRepoInstance = isMockEnabled
      ? new MockPostRepository(challengeRepo, realtimeService)
      : new SupabasePostRepository()
  }
  return postRepoInstance
}
