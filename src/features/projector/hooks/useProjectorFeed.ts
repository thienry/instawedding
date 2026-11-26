import { useEffect, useMemo, useState } from 'react'

import { isShownOnProjector } from '@/features/projector/utils/projector-posts'
import { useRemovedPosts } from '@/hooks/useRemovedPosts'
import {
  getBannedTermRepository,
  getPostRepository,
  getRealtimeService,
} from '@/services/repositories.factory'
import { findBannedTerm } from '@/utils/banned-terms'

import type { Post } from '@/types/domain'

/** Covers for realtime events lost while offline. */
const POLL_INTERVAL_MS = 30_000
const REMOVED_CHECK_MS = 10_000
const ANNOUNCEMENT_MS = 6000

/** Posts of the projector, as returned by {@link useProjectorFeed}. */
interface ProjectorFeed {
  /**
   * Newest first. Leaves out the posts whose guests opted out, those taken off
   * by a moderator and those with a banned term.
   */
  readonly posts: readonly Post[]
  /** Post that has just arrived, while it is announced. */
  readonly newPost: Post | null
}

/** Keeps the posts of the projector up to date. */
export function useProjectorFeed(): ProjectorFeed {
  const [posts, setPosts] = useState<readonly Post[]>([])
  const [newPost, setNewPost] = useState<Post | null>(null)
  const [bannedTerms, setBannedTerms] = useState<readonly string[]>([])
  const postRepository = getPostRepository()
  const bannedTermRepository = getBannedTermRepository()
  const realtimeService = getRealtimeService()

  useEffect(() => {
    let isMounted = true

    const refresh = async () => {
      try {
        const fetched = await postRepository.getPosts()
        if (isMounted) setPosts(fetched.filter(isShownOnProjector))
      } catch {
        // Keep showing the current posts
      }
    }
    const refreshTerms = async () => {
      try {
        const terms = await bannedTermRepository.getTerms()
        if (isMounted) setBannedTerms(terms)
      } catch {
        // Keep the current terms
      }
    }
    const refreshAll = () => {
      void refresh()
      void refreshTerms()
    }

    refreshAll()
    const intervalId = window.setInterval(refreshAll, POLL_INTERVAL_MS)
    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [postRepository, bannedTermRepository])

  useRemovedPosts(
    posts,
    REMOVED_CHECK_MS,
    (ids) => {
      setPosts((prev) => prev.filter(({ id }) => !ids.has(id)))
      setNewPost((prev) => (prev && ids.has(prev.id) ? null : prev))
    },
    () => postRepository.getProjectorPostIds()
  )

  useEffect(() => {
    return realtimeService.subscribeToNewPosts((post) => {
      if (!isShownOnProjector(post)) return
      setPosts((prev) => (prev.some(({ id }) => id === post.id) ? prev : [post, ...prev]))
      setNewPost(post)
    })
  }, [realtimeService])

  useEffect(() => {
    if (!newPost) return
    const timeoutId = window.setTimeout(() => setNewPost(null), ANNOUNCEMENT_MS)
    return () => window.clearTimeout(timeoutId)
  }, [newPost])

  const allowedPosts = useMemo(
    () => posts.filter((post) => findBannedTerm(post, bannedTerms) === null),
    [posts, bannedTerms]
  )
  const isNewPostAllowed = newPost !== null && findBannedTerm(newPost, bannedTerms) === null

  return { posts: allowedPosts, newPost: isNewPostAllowed ? newPost : null }
}
