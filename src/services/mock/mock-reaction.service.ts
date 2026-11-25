import { parseReactions } from '@/utils/reactions'

import type { ReactionCallback, ReactionService } from '@/services/contracts/reaction.contract'
import type { UnsubscribeFunction } from '@/services/contracts/realtime.contract'
import type { ReactionEmoji } from '@/utils/reactions'

const BROADCAST_CHANNEL_NAME = 'instawedding_reactions'

/** Sends reactions between tabs of the same browser. */
export class MockReactionService implements ReactionService {
  private readonly channel: BroadcastChannel | null = null
  private readonly listeners = new Set<ReactionCallback>()

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      this.channel.onmessage = (event: MessageEvent<unknown>) => this.notify(event.data)
    }
  }

  send(emojis: readonly ReactionEmoji[]): Promise<void> {
    this.notify({ emojis })
    this.channel?.postMessage({ emojis })
    return Promise.resolve()
  }

  subscribe(callback: ReactionCallback): UnsubscribeFunction {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private notify(payload: unknown): void {
    const emojis = parseReactions(payload)
    if (emojis.length === 0) return
    for (const listener of this.listeners) listener(emojis)
  }
}
