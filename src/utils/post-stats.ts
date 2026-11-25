import type { Post } from '@/types/domain'

/** Guest ranked by how much they posted. */
interface Contributor {
  /** Tells apart guests with the same name. */
  readonly key: string
  readonly name: string
  readonly avatarUrl: string | null
  readonly postCount: number
  /** Likes received across every post. */
  readonly likes: number
}

/** Whether the post tells who made it. Some old ones only have a name. */
export function hasAuthorId({ clientSessionId }: Post): boolean {
  return Boolean(clientSessionId) && clientSessionId !== 'anonymous'
}

/** Identifies who made the post, by id or else by name. */
export function getAuthorKey(post: Post): string {
  if (post.clientSessionId && hasAuthorId(post)) return post.clientSessionId
  return post.authorName.trim().toLowerCase()
}

/** Adds up the likes of every post. */
export function countLikes(posts: readonly Post[]): number {
  return posts.reduce((total, post) => total + post.likesCount, 0)
}

/**
 * Ranks the guests who posted the most, breaking ties by likes received.
 *
 * Guests with the same name are told apart by account. In older posts without
 * one, names that differ only in case or surrounding spaces count as one guest.
 *
 * @param limit - Maximum number of guests returned.
 */
export function rankContributors(posts: readonly Post[], limit: number): Contributor[] {
  const contributors = new Map<string, Contributor>()
  for (const post of posts) {
    const name = post.authorName.trim()
    if (!name) continue
    const key = getAuthorKey(post)
    const current = contributors.get(key)
    contributors.set(key, {
      key,
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
