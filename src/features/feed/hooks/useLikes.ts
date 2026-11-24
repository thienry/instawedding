import { useEffect, useRef, useState } from 'react'

import { withMembership } from '@/features/feed/utils/feed-posts'
import { getPostRepository } from '@/services/repositories.factory'

import type { FeedGuest } from '@/features/feed/hooks/useFeedGuest'
import type { FeedPosts } from '@/features/feed/hooks/useFeedPosts'

const DOUBLE_TAP_MS = 320
const HEART_BURST_MS = 750
const LOGIN_REASON = 'Conecte sua conta Google para curtir as fotos da festa.'

/** Like actions, as returned by {@link useLikes}. */
export interface Likes {
  /** Likes or unlikes a post, asking signed-out guests to log in. */
  readonly toggleLike: (postId: string) => Promise<void>
  /** Registers a tap on the media; the second one in a row likes the post. */
  readonly tapMedia: (postId: string) => void
  /** Post showing the heart animation, or `null`. */
  readonly heartBurstPostId: string | null
}

/** Likes posts optimistically, by button or double tap. */
export function useLikes(
  {
    likedPostIds,
    setLikedPostIds,
    posts,
    setPosts,
  }: Pick<FeedPosts, 'likedPostIds' | 'setLikedPostIds' | 'posts' | 'setPosts'>,
  {
    guestUser,
    likerId,
    openAuthPrompt,
  }: Pick<FeedGuest, 'guestUser' | 'likerId' | 'openAuthPrompt'>
): Likes {
  const [heartBurstPostId, setHeartBurstPostId] = useState<string | null>(null)
  const pendingRef = useRef(new Set<string>())
  const lastTapsRef = useRef(new Map<string, number>())
  const postRepository = getPostRepository()

  useEffect(() => {
    if (heartBurstPostId === null) return
    const timer = setTimeout(() => setHeartBurstPostId(null), HEART_BURST_MS)
    return () => clearTimeout(timer)
  }, [heartBurstPostId])

  const setLikesCount = (postId: string, likesCount: number) =>
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, likesCount } : post)))

  const toggleLike = async (postId: string) => {
    if (!guestUser) {
      openAuthPrompt(LOGIN_REASON)
      return
    }

    // A second toggle before the answer would race with the first one
    if (pendingRef.current.has(postId)) return
    pendingRef.current.add(postId)

    const wasLiked = likedPostIds.has(postId)
    const previousCount = posts.find(({ id }) => id === postId)?.likesCount ?? 0
    setLikedPostIds((prev) => withMembership(prev, postId, !wasLiked))
    setLikesCount(postId, Math.max(0, previousCount + (wasLiked ? -1 : 1)))

    try {
      const { isLiked, likesCount } = await postRepository.toggleLike(postId, likerId)
      setLikedPostIds((prev) => withMembership(prev, postId, isLiked))
      if (likesCount !== null) setLikesCount(postId, likesCount)
    } catch {
      setLikedPostIds((prev) => withMembership(prev, postId, wasLiked))
      setLikesCount(postId, previousCount)
    } finally {
      pendingRef.current.delete(postId)
    }
  }

  const tapMedia = (postId: string) => {
    const now = Date.now()
    const lastTap = lastTapsRef.current.get(postId) ?? 0
    if (now - lastTap >= DOUBLE_TAP_MS) {
      lastTapsRef.current.set(postId, now)
      return
    }

    lastTapsRef.current.set(postId, 0)
    if (!guestUser) {
      openAuthPrompt(LOGIN_REASON)
      return
    }

    setHeartBurstPostId(postId)
    if (!likedPostIds.has(postId)) void toggleLike(postId)
  }

  return { toggleLike, tapMedia, heartBurstPostId }
}
