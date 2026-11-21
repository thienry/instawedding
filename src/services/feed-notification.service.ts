import { getGuestAuthService } from '@/services/guest-auth.factory'
import {
  getPostRepository,
  getRealtimeService,
} from '@/services/repositories.factory'
import { getGuestSession } from '@/utils/session'

import type { Post } from '@/types/domain'

const LAST_SEEN_POST_AT_KEY = 'instawedding_last_seen_post_at'

export interface NotificationAuthorPreview {
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

type NotificationStateListener = (state: FeedNotificationState) => void

/**
 * Coordinates real-time incoming posts buffer and tracks posts published while the guest was away.
 */
class FeedNotificationManager {
  private stagedPosts: Post[] = []
  private knownPostIds = new Set<string>()
  private unseenAwayPosts: Post[] = []
  private unseenAwayPostIds = new Set<string>()
  private readonly listeners = new Set<NotificationStateListener>()
  private isInitialized = false
  private isCheckingVisibility = false

  /**
   * Starts global listeners for realtime post events and page visibility changes.
   */
  initialize(): void {
    if (this.isInitialized) return
    this.isInitialized = true

    const realtimeService = getRealtimeService()
    realtimeService.subscribeToNewPosts((newPost) => {
      this.handleIncomingRealtimePost(newPost)
    })

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void this.checkNewPostsAfterBackground()
        }
      })
    }

    // Initial background fetch so badge is accurate even if user starts on /challenges or /capture
    void this.initialFetchIfNeeded()
  }

  /**
   * Subscribes to changes in the notification state.
   */
  subscribe(listener: NotificationStateListener): () => void {
    this.initialize()
    this.listeners.add(listener)
    listener(this.getState())

    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Returns a snapshot of the current notification state.
   */
  getState(): FeedNotificationState {
    const combinedUnreadPosts = [...this.stagedPosts, ...this.unseenAwayPosts]
    const uniquePostsMap = new Map<string, Post>()
    for (const post of combinedUnreadPosts) {
      if (!uniquePostsMap.has(post.id)) {
        uniquePostsMap.set(post.id, post)
      }
    }

    const deduplicatedUnread = Array.from(uniquePostsMap.values())
    const authorsMap = new Map<string, NotificationAuthorPreview>()

    for (const post of deduplicatedUnread) {
      const normalizedKey = post.authorName.trim().toLowerCase()
      if (!normalizedKey || authorsMap.has(normalizedKey)) continue
      authorsMap.set(normalizedKey, {
        name: post.authorName.trim(),
        avatarUrl: post.authorAvatarUrl ?? null,
      })
      if (authorsMap.size >= 3) break
    }

    return {
      stagedPosts: [...this.stagedPosts],
      unseenAwayPostIds: new Set(this.unseenAwayPostIds),
      unseenAwayPosts: [...this.unseenAwayPosts],
      totalUnreadCount: deduplicatedUnread.length,
      latestAuthors: Array.from(authorsMap.values()),
    }
  }

  /**
   * Synchronizes the notification manager with a freshly loaded list of posts from the repository.
   */
  syncWithFetchedPosts(fetchedPosts: readonly Post[]): void {
    const lastSeenIso = this.getLastSeenTimestamp()
    const newestTimestamp = this.getNewestTimestamp(fetchedPosts)

    for (const post of fetchedPosts) {
      this.knownPostIds.add(post.id)
    }

    // Remove any staged posts that are already part of fetchedPosts
    const fetchedIds = new Set(fetchedPosts.map((p) => p.id))
    this.stagedPosts = this.stagedPosts.filter((p) => !fetchedIds.has(p.id))

    // First visit ever: baseline lastSeenPostAt so existing historical posts aren't marked unread
    if (!lastSeenIso) {
      this.setLastSeenTimestamp(newestTimestamp ?? new Date().toISOString())
      this.unseenAwayPosts = []
      this.unseenAwayPostIds.clear()
      this.notifyListeners()
      return
    }

    const lastSeenMs = Date.parse(lastSeenIso)
    if (Number.isNaN(lastSeenMs)) {
      this.setLastSeenTimestamp(newestTimestamp ?? new Date().toISOString())
      this.notifyListeners()
      return
    }

    const unseenFromFetch = fetchedPosts.filter((post) => {
      if (this.isOwnPost(post)) return false
      const createdMs = Date.parse(post.createdAt)
      return !Number.isNaN(createdMs) && createdMs > lastSeenMs
    })

    this.unseenAwayPosts = unseenFromFetch
    this.unseenAwayPostIds = new Set(unseenFromFetch.map((p) => p.id))
    this.notifyListeners()
  }

  /**
   * Registers a post published by the current guest so it is never treated as unread.
   */
  registerOwnPublishedPost(post: Post): void {
    this.knownPostIds.add(post.id)
    this.stagedPosts = this.stagedPosts.filter((p) => p.id !== post.id)
    this.advanceLastSeenIfNewer(post.createdAt)
    this.notifyListeners()
  }

  /**
   * Consumes all staged real-time posts and marks all unread posts (both staged and away) as seen.
   */
  consumeStagedAndMarkSeen(currentFeedPosts?: readonly Post[]): {
    readonly stagedPosts: Post[]
    readonly revealedPostIds: Set<string>
  } {
    const consumed = [...this.stagedPosts]
    const revealedPostIds = new Set<string>([
      ...this.stagedPosts.map((p) => p.id),
      ...this.unseenAwayPostIds,
    ])

    const allCandidatePosts = [
      ...this.stagedPosts,
      ...this.unseenAwayPosts,
      ...(currentFeedPosts ?? []),
    ]
    const newestIso =
      this.getNewestTimestamp(allCandidatePosts) ?? new Date().toISOString()

    this.stagedPosts = []
    this.unseenAwayPosts = []
    this.unseenAwayPostIds.clear()
    this.setLastSeenTimestamp(newestIso)
    this.notifyListeners()

    return {
      stagedPosts: consumed,
      revealedPostIds,
    }
  }

  /**
   * Removes a deleted post from staged and unseen tracking lists.
   */
  removePost(postId: string): void {
    this.stagedPosts = this.stagedPosts.filter((p) => p.id !== postId)
    this.unseenAwayPosts = this.unseenAwayPosts.filter((p) => p.id !== postId)
    this.unseenAwayPostIds.delete(postId)
    this.notifyListeners()
  }

  /**
   * Clears unread indicators and updates the last-seen timestamp without returning staged posts.
   */
  markAllAsSeen(currentFeedPosts?: readonly Post[]): void {
    const allCandidatePosts = [
      ...this.stagedPosts,
      ...this.unseenAwayPosts,
      ...(currentFeedPosts ?? []),
    ]
    const newestIso =
      this.getNewestTimestamp(allCandidatePosts) ?? new Date().toISOString()

    this.stagedPosts = []
    this.unseenAwayPosts = []
    this.unseenAwayPostIds.clear()
    this.setLastSeenTimestamp(newestIso)
    this.notifyListeners()
  }

  private async initialFetchIfNeeded(): Promise<void> {
    if (this.knownPostIds.size > 0) return
    try {
      const posts = await getPostRepository().getPosts()
      if (this.knownPostIds.size === 0) {
        this.syncWithFetchedPosts(posts)
      }
    } catch {
      // Ignore background initial fetch errors
    }
  }

  private async checkNewPostsAfterBackground(): Promise<void> {
    if (this.isCheckingVisibility) return
    this.isCheckingVisibility = true

    try {
      const fetchedPosts = await getPostRepository().getPosts()
      const lastSeenIso = this.getLastSeenTimestamp()
      const lastSeenMs = lastSeenIso ? Date.parse(lastSeenIso) : 0

      let hasChanges = false
      for (const post of fetchedPosts) {
        if (this.knownPostIds.has(post.id)) continue
        this.knownPostIds.add(post.id)

        if (this.isOwnPost(post)) continue

        const createdMs = Date.parse(post.createdAt)
        if (!lastSeenMs || (!Number.isNaN(createdMs) && createdMs > lastSeenMs)) {
          if (!this.stagedPosts.some((p) => p.id === post.id)) {
            this.stagedPosts = [post, ...this.stagedPosts]
            hasChanges = true
          }
        }
      }

      if (hasChanges) {
        this.stagedPosts.sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
        )
        this.notifyListeners()
      }
    } catch {
      // Ignore network errors on visibility check
    } finally {
      this.isCheckingVisibility = false
    }
  }

  private handleIncomingRealtimePost(newPost: Post): void {
    if (this.knownPostIds.has(newPost.id)) return
    this.knownPostIds.add(newPost.id)

    if (this.isOwnPost(newPost)) {
      this.advanceLastSeenIfNewer(newPost.createdAt)
      return
    }

    if (!this.stagedPosts.some((p) => p.id === newPost.id)) {
      this.stagedPosts = [newPost, ...this.stagedPosts]
      this.notifyListeners()
    }
  }

  private isOwnPost(post: Post): boolean {
    const guestUser = getGuestAuthService().getCurrentGuest()
    const session = getGuestSession()

    if (
      post.clientSessionId &&
      (post.clientSessionId === session.sessionId ||
        (guestUser && post.clientSessionId === guestUser.id))
    ) {
      return true
    }

    if (
      guestUser &&
      post.authorName.trim().toLowerCase() ===
        guestUser.name.trim().toLowerCase()
    ) {
      return true
    }

    return false
  }

  private getNewestTimestamp(posts: readonly Post[]): string | null {
    let maxMs = -1
    let maxIso: string | null = null

    for (const post of posts) {
      const ms = Date.parse(post.createdAt)
      if (!Number.isNaN(ms) && ms > maxMs) {
        maxMs = ms
        maxIso = post.createdAt
      }
    }

    return maxIso
  }

  private getLastSeenTimestamp(): string | null {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(LAST_SEEN_POST_AT_KEY)
  }

  private setLastSeenTimestamp(isoTimestamp: string): void {
    if (typeof localStorage === 'undefined') return
    const currentIso = localStorage.getItem(LAST_SEEN_POST_AT_KEY)
    if (currentIso) {
      const currentMs = Date.parse(currentIso)
      const nextMs = Date.parse(isoTimestamp)
      if (!Number.isNaN(currentMs) && !Number.isNaN(nextMs) && nextMs < currentMs) {
        return
      }
    }
    localStorage.setItem(LAST_SEEN_POST_AT_KEY, isoTimestamp)
  }

  private advanceLastSeenIfNewer(isoTimestamp: string): void {
    this.setLastSeenTimestamp(isoTimestamp)
  }

  private notifyListeners(): void {
    const snapshot = this.getState()
    for (const listener of this.listeners) {
      try {
        listener(snapshot)
      } catch {
        // Prevent a single subscriber failure from breaking others
      }
    }
  }
}

export const FeedNotificationService = new FeedNotificationManager()
