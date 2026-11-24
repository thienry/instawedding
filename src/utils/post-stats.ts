import type { Post } from '@/types/domain'

/** Guest ranked by how much they posted. */
interface Contributor {
  readonly name: string
  readonly avatarUrl: string | null
  readonly postCount: number
  /** Likes received across every post. */
  readonly likes: number
}

/** Adds up the likes of every post. */
export function countLikes(posts: readonly Post[]): number {
  return posts.reduce((total, post) => total + post.likesCount, 0)
}

/**
 * Ranks the guests who posted the most, breaking ties by likes received.
 *
 * Names that differ only in case or surrounding spaces count as one guest.
 *
 * @param limit - Maximum number of guests returned.
 */
export function rankContributors(posts: readonly Post[], limit: number): Contributor[] {
  const contributors = new Map<string, Contributor>()
  for (const post of posts) {
    const name = post.authorName.trim()
    if (!name) continue
    const key = name.toLowerCase()
    const current = contributors.get(key)
    contributors.set(key, {
      name: current?.name ?? name,
      avatarUrl: current?.avatarUrl || (post.authorAvatarUrl ?? null),
      postCount: (current?.postCount ?? 0) + 1,
      likes: (current?.likes ?? 0) + post.likesCount,
    })
  }
  return [...contributors.values()]
    .sort((a, b) => b.postCount - a.postCount || b.likes - a.likes)
    .slice(0, limit)
}
