import { useEffect, useState } from 'react'

import {
  getChallengeRepository,
  getPostRepository,
} from '@/services/repositories.factory'

import type { Challenge, Post } from '@/types/domain'

/** Data of the challenges page, as returned by {@link useChallengeBoard}. */
interface ChallengeBoard {
  readonly challenges: readonly Challenge[]
  readonly posts: readonly Post[]
  readonly isLoading: boolean
  readonly hasError: boolean
  readonly retry: () => void
}

/** Loads the challenges and the posts that count for them. */
export function useChallengeBoard(): ChallengeBoard {
  const [challenges, setChallenges] = useState<readonly Challenge[]>([])
  const [posts, setPosts] = useState<readonly Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const challengeRepo = getChallengeRepository()
  const postRepo = getPostRepository()

  useEffect(() => {
    let isMounted = true
    async function load() {
      try {
        const [challengeList, postList] = await Promise.all([
          challengeRepo.getChallenges(),
          postRepo.getPosts(),
        ])
        if (!isMounted) return
        setChallenges(challengeList)
        setPosts(postList)
      } catch {
        if (isMounted) setHasError(true)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [challengeRepo, postRepo, attempt])

  const retry = () => {
    setHasError(false)
    setIsLoading(true)
    setAttempt((prev) => prev + 1)
  }

  return { challenges, posts, isLoading, hasError, retry }
}
