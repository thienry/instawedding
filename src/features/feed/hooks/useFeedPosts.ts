import { useCallback, useEffect, useState } from 'react'

import { mergeNewPosts, withMembership } from '@/features/feed/utils/feed-posts'
import { FeedNotificationService } from '@/services/feed-notification.service'
import { OfflineQueueService } from '@/services/offline-queue.service'
import { getPostRepository } from '@/services/repositories.factory'

import type { FeedGuest } from '@/features/feed/hooks/useFeedGuest'
import type { Post } from '@/types/domain'
import type { Dispatch, SetStateAction } from 'react'

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
  const [likedPostIds, setLikedPostIds] = useState<ReadonlySet<string>>(
    new Set()
  )
  const [revealedPostIds, setRevealedPostIds] = useState<ReadonlySet<string>>(
    new Set()
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const postRepository = getPostRepository()

  const fetchFeed = useCallback(
    () =>
      Promise.all([
        postRepository.getPosts(),
        guestUser
          ? postRepository.getLikedPostIds(likerId)
          : Promise.resolve(new Set<string>()),
      ]),
    [guestUser, likerId, postRepository]
  )

  useEffect(() => {
    FeedNotificationService.initialize()
    return OfflineQueueService.onPostPublished((post) => {
      FeedNotificationService.registerOwnPublishedPost(post)
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
        setIsLoading(false)
      })
      .catch(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [fetchFeed])

  const addRevealedIds = (ids: ReadonlySet<string>) =>
    setRevealedPostIds((prev) => new Set([...prev, ...ids]))

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      const [fetchedPosts, likedIds] = await fetchFeed()
      const revealed =
        FeedNotificationService.consumeStagedAndMarkSeen(fetchedPosts)
      addRevealedIds(revealed.revealedPostIds)
      setPosts(fetchedPosts)
      setLikedPostIds(likedIds)
    } catch {
      // Keep showing the current posts
    } finally {
      setIsRefreshing(false)
    }
  }

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
    refresh,
    revealNewPosts,
    removePost,
  }
}
