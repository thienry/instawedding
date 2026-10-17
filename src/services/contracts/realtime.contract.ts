import type { Post } from '@/types/domain'

export type PostSubscriptionCallback = (post: Post) => void
export type UnsubscribeFunction = () => void

export interface RealtimeService {
  subscribeToNewPosts(callback: PostSubscriptionCallback): UnsubscribeFunction
  broadcastNewPost(post: Post): void
}
