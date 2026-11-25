import { ChallengeCard } from '@/features/admin/components/ChallengeCard'

import type { ChallengeAdmin } from '@/features/admin/hooks/useChallenges'
import type { Challenge } from '@/types/domain'

interface ChallengeListProps {
  readonly challenges: readonly Challenge[]
  readonly challengeAdmin: ChallengeAdmin
  readonly isAdmin: boolean
}

/** Every challenge, paused ones included. */
export function ChallengeList({ challenges, challengeAdmin, isAdmin }: ChallengeListProps) {
  const { toggleChallenge, deleteChallenge } = challengeAdmin

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 sm:gap-4">
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          onToggle={() => void toggleChallenge(challenge)}
          onDelete={isAdmin ? () => void deleteChallenge(challenge.id) : undefined}
        />
      ))}
    </div>
  )
}
