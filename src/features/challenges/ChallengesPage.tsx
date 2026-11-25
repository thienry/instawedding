import { useMemo } from 'react'

import { ChallengeCard } from '@/features/challenges/components/ChallengeCard'
import { ChallengesBanner } from '@/features/challenges/components/ChallengesBanner'
import { ChallengesError } from '@/features/challenges/components/ChallengesError'
import { ChallengesSkeleton } from '@/features/challenges/components/ChallengesSkeleton'
import { PhotographerRanking } from '@/features/challenges/components/PhotographerRanking'
import { useChallengeBoard } from '@/features/challenges/hooks/useChallengeBoard'
import {
  countPostsByChallenge,
  findCompletedChallenges,
} from '@/features/challenges/utils/challenge-progress'
import { useGuestAuth } from '@/hooks/useGuestAuth'
import { getGuestSession } from '@/utils/session'

/** Photo challenges, the guest progress and the ranking of the party. */
export function ChallengesPage() {
  const { challenges, posts, isLoading, hasError, retry } = useChallengeBoard()
  const { guestUser } = useGuestAuth()
  const { sessionId, guestName } = getGuestSession()

  const completedIds = useMemo(
    () => findCompletedChallenges(posts, guestUser, { sessionId, guestName }),
    [posts, guestUser, sessionId, guestName]
  )
  const postCounts = useMemo(() => countPostsByChallenge(posts), [posts])
  const completedCount = challenges.filter(({ id }) => completedIds.has(id)).length

  return (
    <div className="px-4 py-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-6">
      <ChallengesBanner completedCount={completedCount} totalChallenges={challenges.length} />
      <PhotographerRanking posts={posts} />
      {isLoading ? (
        <ChallengesSkeleton />
      ) : hasError ? (
        <ChallengesError onRetry={retry} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-6">
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              isCompleted={completedIds.has(challenge.id)}
              communityCount={postCounts.get(challenge.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
