import { parseReactions } from '@/utils/reactions'

import type {
  ProjectorCallback,
  ReactionCallback,
  ReactionService,
} from '@/services/contracts/reaction.contract'
import type { UnsubscribeFunction } from '@/services/contracts/realtime.contract'
import type { ReactionEmoji } from '@/utils/reactions'

const PRESENCE_CHANNEL_NAME = 'instawedding_projector'
const BROADCAST_CHANNEL_NAME = 'instawedding_reactions'

type PresenceMessage = 'ask' | 'active' | 'inactive'

/** Sends reactions between tabs of the same browser. */
export class MockReactionService implements ReactionService {
  private readonly channel: BroadcastChannel | null = null
  private readonly presence: BroadcastChannel | null = null
  private isOtherTabActive = false
  private readonly listeners = new Set<ReactionCallback>()
  private readonly watchers = new Set<ProjectorCallback>()

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      this.channel.onmessage = (event: MessageEvent<unknown>) => this.notify(event.data)
      this.presence = new BroadcastChannel(PRESENCE_CHANNEL_NAME)
      this.presence.onmessage = (event: MessageEvent<PresenceMessage>) =>
        this.handlePresence(event.data)
      window.addEventListener('pagehide', () => {
        if (this.listeners.size > 0) this.postPresence('inactive')
      })
    }
  }

  send(emojis: readonly ReactionEmoji[]): Promise<void> {
    this.notify({ emojis })
    this.channel?.postMessage({ emojis })
    return Promise.resolve()
  }

  subscribe(callback: ReactionCallback): UnsubscribeFunction {
    this.listeners.add(callback)
    this.postPresence('active')
    this.notifyWatchers()
    return () => {
      this.listeners.delete(callback)
      if (this.listeners.size === 0) this.postPresence('inactive')
      this.notifyWatchers()
    }
  }

  watchProjector(callback: ProjectorCallback): UnsubscribeFunction {
    this.watchers.add(callback)
    callback(this.isProjectorActive())
    this.postPresence('ask')
    return () => {
      this.watchers.delete(callback)
    }
  }

  private handlePresence(message: PresenceMessage): void {
    if (message === 'ask') {
      if (this.listeners.size > 0) this.postPresence('active')
      return
    }
    this.isOtherTabActive = message === 'active'
    this.notifyWatchers()
    // Another projector may still be open
    if (message === 'inactive') this.postPresence('ask')
  }

  private isProjectorActive(): boolean {
    return this.listeners.size > 0 || this.isOtherTabActive
  }

  private postPresence(message: PresenceMessage): void {
    this.presence?.postMessage(message)
  }

  private notifyWatchers(): void {
    for (const watcher of this.watchers) watcher(this.isProjectorActive())
  }

  private notify(payload: unknown): void {
    const emojis = parseReactions(payload)
    if (emojis.length === 0) return
    for (const listener of this.listeners) listener(emojis)
  }
}
