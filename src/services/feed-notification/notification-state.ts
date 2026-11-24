import type { Post } from '@/types/domain'

const MAX_AUTHORS = 3

interface NotificationAuthorPreview {
  readonly name: string
  readonly avatarUrl: string | null
}

export interface FeedNotificationState {
  readonly stagedPosts: readonly Post[]
  readonly unseenAwayPostIds: ReadonlySet<string>
  readonly unseenAwayPosts: readonly Post[]
  readonly totalUnreadCount: number
  readonly latestAuthors: readonly NotificationAuthorPreview[]
}

function listAuthors(posts: Iterable<Post>): NotificationAuthorPreview[] {
  const authors = new Map<string, NotificationAuthorPreview>()
  for (const post of posts) {
    const name = post.authorName.trim()
    const key = name.toLowerCase()
    if (!key || authors.has(key)) continue
    authors.set(key, { name, avatarUrl: post.authorAvatarUrl ?? null })
    if (authors.size >= MAX_AUTHORS) break
  }
  return [...authors.values()]
}

/** Summarizes the unread posts, counting each one once. */
export function summarizeUnread(
  stagedPosts: readonly Post[],
  unseenAwayPosts: readonly Post[]
): FeedNotificationState {
  const unread = new Map<string, Post>()
  for (const post of [...stagedPosts, ...unseenAwayPosts]) {
    if (!unread.has(post.id)) unread.set(post.id, post)
  }
  return {
    stagedPosts: [...stagedPosts],
    unseenAwayPostIds: new Set(unseenAwayPosts.map(({ id }) => id)),
    unseenAwayPosts: [...unseenAwayPosts],
    totalUnreadCount: unread.size,
    latestAuthors: listAuthors(unread.values()),
  }
}
