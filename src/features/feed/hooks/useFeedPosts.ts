import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'

import { mergeNewPosts, withMembership } from '@/features/feed/utils/feed-posts'
import { useRemovedPosts } from '@/hooks/useRemovedPosts'
import { useVisibleInterval } from '@/hooks/useVisibleInterval'
import { FeedNotificationService } from '@/services/feed-notification.service'
import { OfflineQueueService } from '@/services/offline-queue.service'
import { getPostRepository } from '@/services/repositories.factory'

import type { FeedGuest } from '@/features/feed/hooks/useFeedGuest'
import type { Post } from '@/types/domain'
import type { Dispatch, SetStateAction } from 'react'

const REMOVED_CHECK_MS = 30_000
/** Time between attempts after a failed load. */
const RETRY_MS = 15_000

/** Posts of the feed, as returned by {@link useFeedPosts}. */
export interface FeedPosts {
  readonly posts: readonly Post[]
  readonly setPosts: Dispatch<SetStateAction<readonly Post[]>>
  /** Posts liked by the signed-in guest. */
  readonly likedPostIds: ReadonlySet<string>
  readonly setLikedPostIds: Dispatch<SetStateAction<ReadonlySet<string>>>
  /** New posts already revealed, still highlighted in this visit. */
  readonly revealedPostIds: ReadonlySet<string>
  readonly isLoading: boolean
  readonly isRefreshing: boolean
  /** Whether the last load failed. */
  readonly hasError: boolean
  /** Reloads everything. A failure keeps the current posts. */
  readonly refresh: () => Promise<void>
  /** Shows the posts waiting in the notification and marks them as seen. */
  readonly revealNewPosts: () => void
  /** Drops a deleted post from every list. */
  readonly removePost: (postId: string) => void
}

/** Loads the feed and keeps it in sync with the guest's own uploads. */
export function useFeedPosts({
  guestUser,
  likerId,
}: Pick<FeedGuest, 'guestUser' | 'likerId'>): FeedPosts {
  const [posts, setPosts] = useState<readonly Post[]>([])
  const [likedPostIds, setLikedPostIds] = useState<ReadonlySet<string>>(new Set())
  const [revealedPostIds, setRevealedPostIds] = useState<ReadonlySet<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasError, setHasError] = useState(false)
  // Posts of the guest published in this visit
  const publishedRef = useRef<Post[]>([])
  const postRepository = getPostRepository()

  const fetchFeed = useCallback(async () => {
    const publishedCount = publishedRef.current.length
    const [fetchedPosts, likedIds] = await Promise.all([
      postRepository.getPosts(),
      guestUser ? postRepository.getLikedPostIds(likerId) : new Set<string>(),
    ])
    // The answer may not have what was published meanwhile
    const published = publishedRef.current.slice(publishedCount)
    return [mergeNewPosts(fetchedPosts, published), likedIds] as const
  }, [guestUser, likerId, postRepository])

  useEffect(() => {
    FeedNotificationService.initialize()
    return OfflineQueueService.onPostPublished((post) => {
      FeedNotificationService.registerOwnPublishedPost(post)
      publishedRef.current.push(post)
      setPosts((prev) => mergeNewPosts(prev, [post]))
    })
  }, [])

  useEffect(() => {
    let isMounted = true

    fetchFeed()
      .then(([fetchedPosts, likedIds]) => {
        if (!isMounted) return
        FeedNotificationService.syncWithFetchedPosts(fetchedPosts)
        setPosts(fetchedPosts)
        setLikedPostIds(likedIds)
        setHasError(false)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setHasError(true)
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [fetchFeed])

  const { stagedPosts } = FeedNotificationService.getState()
  useRemovedPosts([...posts, ...stagedPosts], REMOVED_CHECK_MS, (ids) => {
    for (const id of ids) FeedNotificationService.removePost(id)
    setPosts((prev) => prev.filter(({ id }) => !ids.has(id)))
  })

  const addRevealedIds = (ids: ReadonlySet<string>) =>
    setRevealedPostIds((prev) => new Set([...prev, ...ids]))

  const reload = async (onLoaded: (posts: readonly Post[]) => void) => {
    setIsRefreshing(true)
    try {
      const [fetchedPosts, likedIds] = await fetchFeed()
      onLoaded(fetchedPosts)
      setPosts(fetchedPosts)
      setLikedPostIds(likedIds)
      setHasError(false)
    } catch {
      // Keep showing the current posts
      setHasError(true)
    } finally {
      setIsRefreshing(false)
    }
  }

  const refresh = () =>
    reload((fetchedPosts) => {
      const revealed = FeedNotificationService.consumeStagedAndMarkSeen(fetchedPosts)
      addRevealedIds(revealed.revealedPostIds)
    })

  // The guest may not be looking, so nothing is marked as seen
  const retry = () => {
    if (!hasError || isRefreshing) return
    void reload((fetchedPosts) => FeedNotificationService.syncWithFetchedPosts(fetchedPosts))
  }
  useVisibleInterval(retry, RETRY_MS)
  const retryOnline = useEffectEvent(retry)
  useEffect(() => {
    const handleOnline = () => retryOnline()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const revealNewPosts = () => {
    const revealed = FeedNotificationService.consumeStagedAndMarkSeen(posts)
    setPosts((prev) => mergeNewPosts(prev, revealed.stagedPosts))
    addRevealedIds(revealed.revealedPostIds)
  }

  const removePost = (postId: string) => {
    FeedNotificationService.removePost(postId)
    setPosts((prev) => prev.filter((post) => post.id !== postId))
    setLikedPostIds((prev) => withMembership(prev, postId, false))
  }

  return {
    posts,
    setPosts,
    likedPostIds,
    setLikedPostIds,
    revealedPostIds,
    isLoading,
    isRefreshing,
    hasError,
    refresh,
    revealNewPosts,
    removePost,
  }
}
