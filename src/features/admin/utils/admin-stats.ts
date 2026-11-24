import { resolvePostMediaType } from '@/utils/video'

import type { Post } from '@/types/domain'

/** Event metrics shown on the dashboard. */
export interface AdminStats {
  readonly totalPosts: number
  readonly approvedPosts: number
  readonly totalPhotos: number
  readonly totalVideos: number
  /** Post with the most likes; the first one wins ties. */
  readonly topLikedPost: Post | null
  /** Guest with the most approved posts, or `null` when there is none. */
  readonly topAuthor: TopAuthor | null
  /** Posts made for a challenge. */
  readonly challengePosts: number
  /** Share of posts made for a challenge, as a rounded percentage. */
  readonly challengeRate: number
}

/** Guest with the most approved posts. */
interface TopAuthor {
  readonly name: string
  readonly postCount: number
}

function findTopLikedPost(posts: readonly Post[]): Post | null {
  return posts.reduce<Post | null>(
    (top, post) => (top && top.likesCount >= post.likesCount ? top : post),
    null
  )
}

function findTopAuthor(posts: readonly Post[]): TopAuthor | null {
  const counts = new Map<string, number>()
  for (const { authorName } of posts) {
    counts.set(authorName, (counts.get(authorName) ?? 0) + 1)
  }

  let top: TopAuthor | null = null
  for (const [name, postCount] of counts) {
    if (!top || postCount > top.postCount) top = { name, postCount }
  }
  return top
}

/** Computes the event metrics from every post, hidden ones included. */
export function computeAdminStats(posts: readonly Post[]): AdminStats {
  const totalPosts = posts.length
  const approvedPosts = posts.filter((post) => post.isApproved)
  const totalVideos = posts.filter(
    (post) => resolvePostMediaType(post) === 'video'
  ).length
  const challengePosts = posts.filter((post) => post.challengeId != null).length

  return {
    totalPosts,
    approvedPosts: approvedPosts.length,
    totalPhotos: totalPosts - totalVideos,
    totalVideos,
    topLikedPost: findTopLikedPost(posts),
    topAuthor: findTopAuthor(approvedPosts),
    challengePosts,
    challengeRate:
      totalPosts > 0 ? Math.round((challengePosts / totalPosts) * 100) : 0,
  }
}
