import { getSupabaseClient } from '@/services/supabase/supabase.client'
import { parseReactions } from '@/utils/reactions'

import type {
  ProjectorCallback,
  ReactionCallback,
  ReactionService,
} from '@/services/contracts/reaction.contract'
import type { UnsubscribeFunction } from '@/services/contracts/realtime.contract'
import type { ReactionEmoji } from '@/utils/reactions'
import type { RealtimeChannel } from '@supabase/supabase-js'

const TOPIC = 'projector-reactions'
/** Apart from the reactions, so guests who watch it do not receive them. */
const PRESENCE_TOPIC = 'projector-presence'
const EVENT = 'reaction'
const SEND_TIMEOUT_MS = 8000

/**
 * Guests send over HTTP; only the projector joins the reactions channel. It is
 * announced in a presence channel, which the server clears on disconnection.
 *
 * There is a single channel per topic, never left once joined: the client would
 * return a channel still closing to whoever asks for the same topic again.
 */
export class SupabaseReactionService implements ReactionService {
  private channel: RealtimeChannel | null = null
  private isJoined = false
  private presence: RealtimeChannel | null = null
  private isPresenceJoined = false
  private isProjectorActive = false
  private readonly listeners = new Set<ReactionCallback>()
  private readonly watchers = new Set<ProjectorCallback>()

  async send(emojis: readonly ReactionEmoji[]): Promise<void> {
    await this.getChannel().httpSend(EVENT, { emojis }, { timeout: SEND_TIMEOUT_MS })
  }

  subscribe(callback: ReactionCallback): UnsubscribeFunction {
    this.listeners.add(callback)
    if (!this.isJoined) {
      this.isJoined = true
      this.getChannel()
        .on('broadcast', { event: EVENT }, ({ payload }: { payload?: unknown }) => {
          const emojis = parseReactions(payload)
          if (emojis.length === 0) return
          for (const listener of this.listeners) listener(emojis)
        })
        .subscribe()
    }
    this.joinPresence()
    this.announce()
    return () => {
      this.listeners.delete(callback)
      this.announce()
    }
  }

  watchProjector(callback: ProjectorCallback): UnsubscribeFunction {
    this.watchers.add(callback)
    this.joinPresence()
    callback(this.isProjectorActive)
    return () => {
      this.watchers.delete(callback)
    }
  }

  private joinPresence(): void {
    if (this.presence) return
    const presence = getSupabaseClient().channel(PRESENCE_TOPIC)
    this.presence = presence
    presence
      .on('presence', { event: 'sync' }, () => {
        this.isProjectorActive = Object.keys(presence.presenceState()).length > 0
        for (const watcher of this.watchers) watcher(this.isProjectorActive)
      })
      .subscribe((status) => {
        // Also runs after a reconnection, when the server has forgotten us
        this.isPresenceJoined = status === 'SUBSCRIBED'
        if (this.listeners.size > 0) this.announce()
      })
  }

  private announce(): void {
    if (!this.presence || !this.isPresenceJoined) return
    if (this.listeners.size > 0) void this.presence.track({})
    else void this.presence.untrack()
  }

  private getChannel(): RealtimeChannel {
    this.channel ??= getSupabaseClient().channel(TOPIC)
    return this.channel
  }
}
