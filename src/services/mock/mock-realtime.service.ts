import type {
  PostSubscriptionCallback,
  RealtimeService,
  UnsubscribeFunction,
} from '@/services/contracts/realtime.contract'
import type { Post } from '@/types/domain'

const BROADCAST_CHANNEL_NAME = 'instawedding_realtime_posts'

export class MockRealtimeService implements RealtimeService {
  private readonly channel: BroadcastChannel | null = null
  private readonly listeners = new Set<PostSubscriptionCallback>()

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      this.channel.onmessage = (event: MessageEvent<Post>) => {
        if (event.data) {
          this.notifyLocalListeners(event.data)
        }
      }
    }
  }

  subscribeToNewPosts(callback: PostSubscriptionCallback): UnsubscribeFunction {
    this.listeners.add(callback)

    return () => {
      this.listeners.delete(callback)
    }
  }

  broadcastNewPost(post: Post): void {
    // Notify listeners in current window/tab
    this.notifyLocalListeners(post)

    // Broadcast to other windows/tabs (e.g. Projector screen tab)
    if (this.channel) {
      try {
        this.channel.postMessage(post)
      } catch {
        // BroadcastChannel serialization fallback
      }
    }
  }

  private notifyLocalListeners(post: Post): void {
    for (const listener of this.listeners) {
      try {
        listener(post)
      } catch {
        // Prevent one faulty listener from breaking others
      }
    }
  }
}
