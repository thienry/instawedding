import { MockChallengeRepository } from './mock/mock-challenge.repository'
import { MockPostRepository } from './mock/mock-post.repository'
import { MockRealtimeService } from './mock/mock-realtime.service'
import { SupabaseChallengeRepository } from './supabase/supabase-challenge.repository'
import { SupabasePostRepository } from './supabase/supabase-post.repository'
import { SupabaseRealtimeService } from './supabase/supabase-realtime.service'

import type { ChallengeRepository } from './contracts/challenge-repository.contract'
import type { PostRepository } from './contracts/post-repository.contract'
import type { RealtimeService } from './contracts/realtime.contract'

const isMockEnabled = import.meta.env.VITE_USE_MOCKS !== 'false'

let challengeRepoInstance: ChallengeRepository | null = null
let realtimeServiceInstance: RealtimeService | null = null
let postRepoInstance: PostRepository | null = null

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
