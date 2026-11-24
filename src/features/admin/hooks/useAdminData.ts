import { useCallback, useEffect, useRef, useState } from 'react'

import { useVisibleInterval } from '@/hooks/useVisibleInterval'
import {
  getChallengeRepository,
  getPostRepository,
  getRealtimeService,
} from '@/services/repositories.factory'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'
import type { Challenge, Post } from '@/types/domain'
import type { Dispatch, SetStateAction } from 'react'

/** Covers for realtime events lost while offline. */
const REFRESH_MS = 60_000

/** Data shared by the dashboard tabs, as returned by {@link useAdminData}. */
export interface AdminData {
  readonly posts: readonly Post[]
  readonly setPosts: Dispatch<SetStateAction<readonly Post[]>>
  readonly challenges: readonly Challenge[]
  readonly setChallenges: Dispatch<SetStateAction<readonly Challenge[]>>
  readonly isLoading: boolean
  /** Whether the last load failed. The lists stay as they were. */
  readonly hasError: boolean
  readonly refresh: () => void
}

/**
 * Loads posts and challenges once a user is signed in and keeps them up to date.
 *
 * Both are loaded together, so one failure leaves both lists as they were.
 *
 * @param currentUser - Signed-in user; nothing is loaded while it is `null`.
 */
export function useAdminData(currentUser: AdminUser | null): AdminData {
  const [posts, setPostsState] = useState<readonly Post[]>([])
  const [challenges, setChallengesState] = useState<readonly Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  // A load that started before a change would undo it on screen
  const versionRef = useRef(0)
  const postRepository = getPostRepository()
  const challengeRepository = getChallengeRepository()
  const userEmail = currentUser?.email

  const setPosts = useCallback<AdminData['setPosts']>((action) => {
    versionRef.current += 1
    setPostsState(action)
  }, [])
  const setChallenges = useCallback<AdminData['setChallenges']>((action) => {
    versionRef.current += 1
    setChallengesState(action)
  }, [])

  const refresh = useCallback(() => {
    if (!userEmail) return
    versionRef.current += 1
    const version = versionRef.current
    const isCurrent = () => versionRef.current === version

    Promise.all([postRepository.getAllPostsForModeration(), challengeRepository.getAllChallenges()])
      .then(([allPosts, allChallenges]) => {
        setHasError(false)
        setIsLoading(false)
        if (!isCurrent()) return
        setPostsState(allPosts)
        setChallengesState(allChallenges)
      })
      .catch(() => {
        setIsLoading(false)
        setHasError(true)
      })
  }, [userEmail, postRepository, challengeRepository])

  useEffect(() => {
    refresh()
    return () => {
      versionRef.current += 1
    }
  }, [refresh])
  useVisibleInterval(refresh, REFRESH_MS)

  useEffect(() => {
    if (!userEmail) return
    return getRealtimeService().subscribeToNewPosts((post) =>
      setPosts((prev) => (prev.some(({ id }) => id === post.id) ? prev : [post, ...prev]))
    )
  }, [userEmail, setPosts])

  return { posts, setPosts, challenges, setChallenges, isLoading, hasError, refresh }
}
