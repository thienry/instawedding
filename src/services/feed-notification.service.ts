import {
  getLastSeenTimestamp,
  getNewestTimestamp,
  setLastSeenTimestamp,
} from '@/services/feed-notification/last-seen'
import { summarizeUnread } from '@/services/feed-notification/notification-state'
import { isOwnPost } from '@/services/feed-notification/own-post'
import { getPostRepository, getRealtimeService } from '@/services/repositories.factory'

import type { FeedNotificationState } from '@/services/feed-notification/notification-state'
import type { Post } from '@/types/domain'

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
    return summarizeUnread(this.stagedPosts, this.unseenAwayPosts)
  }

  /**
   * Synchronizes the notification manager with a freshly loaded list of posts from the repository.
   */
  syncWithFetchedPosts(fetchedPosts: readonly Post[]): void {
    const lastSeenIso = getLastSeenTimestamp()
    const newestTimestamp = getNewestTimestamp(fetchedPosts)

    for (const post of fetchedPosts) {
      this.knownPostIds.add(post.id)
    }

    // Remove any staged posts that are already part of fetchedPosts
    const fetchedIds = new Set(fetchedPosts.map((p) => p.id))
    this.stagedPosts = this.stagedPosts.filter((p) => !fetchedIds.has(p.id))

    // First visit ever: baseline lastSeenPostAt so existing historical posts aren't marked unread
    if (!lastSeenIso) {
      setLastSeenTimestamp(newestTimestamp ?? new Date().toISOString())
      this.unseenAwayPosts = []
      this.unseenAwayPostIds.clear()
      this.notifyListeners()
      return
    }

    const lastSeenMs = Date.parse(lastSeenIso)
    if (Number.isNaN(lastSeenMs)) {
      setLastSeenTimestamp(newestTimestamp ?? new Date().toISOString())
      this.notifyListeners()
      return
    }

    const unseenFromFetch = fetchedPosts.filter((post) => {
      if (isOwnPost(post)) return false
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
    setLastSeenTimestamp(post.createdAt)
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
    const newestIso = getNewestTimestamp(allCandidatePosts) ?? new Date().toISOString()

    this.stagedPosts = []
    this.unseenAwayPosts = []
    this.unseenAwayPostIds.clear()
    setLastSeenTimestamp(newestIso)
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
      const lastSeenIso = getLastSeenTimestamp()
      const lastSeenMs = lastSeenIso ? Date.parse(lastSeenIso) : 0

      let hasChanges = false
      for (const post of fetchedPosts) {
        if (this.knownPostIds.has(post.id)) continue
        this.knownPostIds.add(post.id)

        if (isOwnPost(post)) continue

        const createdMs = Date.parse(post.createdAt)
        if (!lastSeenMs || (!Number.isNaN(createdMs) && createdMs > lastSeenMs)) {
          if (!this.stagedPosts.some((p) => p.id === post.id)) {
            this.stagedPosts = [post, ...this.stagedPosts]
            hasChanges = true
          }
        }
      }

      if (hasChanges) {
        this.stagedPosts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
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

    if (isOwnPost(newPost)) {
      setLastSeenTimestamp(newPost.createdAt)
      return
    }

    if (!this.stagedPosts.some((p) => p.id === newPost.id)) {
      this.stagedPosts = [newPost, ...this.stagedPosts]
      this.notifyListeners()
    }
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
