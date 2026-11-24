import { useEffect, useState } from 'react'

import {
  getChallengeRepository,
  getPostRepository,
} from '@/services/repositories.factory'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'
import type { Challenge, Post } from '@/types/domain'
import type { Dispatch, SetStateAction } from 'react'

/** Data shared by the dashboard tabs, as returned by {@link useAdminData}. */
export interface AdminData {
  readonly posts: readonly Post[]
  readonly setPosts: Dispatch<SetStateAction<readonly Post[]>>
  readonly challenges: readonly Challenge[]
  readonly setChallenges: Dispatch<SetStateAction<readonly Challenge[]>>
  readonly isLoading: boolean
}

/**
 * Loads posts and challenges once a user is signed in.
 *
 * Both are loaded together, so one failure leaves both lists as they were.
 *
 * @param currentUser - Signed-in user; nothing is loaded while it is `null`.
 */
export function useAdminData(currentUser: AdminUser | null): AdminData {
  const [posts, setPosts] = useState<readonly Post[]>([])
  const [challenges, setChallenges] = useState<readonly Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const postRepository = getPostRepository()
  const challengeRepository = getChallengeRepository()

  useEffect(() => {
    if (!currentUser) return
    let isMounted = true

    Promise.all([
      postRepository.getAllPostsForModeration(),
      challengeRepository.getAllChallenges(),
    ])
      .then(([allPosts, allChallenges]) => {
        if (!isMounted) return
        setPosts(allPosts)
        setChallenges(allChallenges)
        setIsLoading(false)
      })
      .catch(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [currentUser, postRepository, challengeRepository])

  return { posts, setPosts, challenges, setChallenges, isLoading }
}
