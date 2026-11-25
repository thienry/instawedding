import { getSupabaseClient } from '@/services/supabase/supabase.client'
import { parseReactions } from '@/utils/reactions'

import type { ReactionCallback, ReactionService } from '@/services/contracts/reaction.contract'
import type { UnsubscribeFunction } from '@/services/contracts/realtime.contract'
import type { ReactionEmoji } from '@/utils/reactions'
import type { RealtimeChannel } from '@supabase/supabase-js'

const TOPIC = 'projector-reactions'
const EVENT = 'reaction'
const SEND_TIMEOUT_MS = 8000

/**
 * Guests send over HTTP; only the projector joins the channel.
 *
 * There is a single channel, never left once joined: the client would return a
 * channel still closing to whoever asks for the same topic again.
 */
export class SupabaseReactionService implements ReactionService {
  private channel: RealtimeChannel | null = null
  private isJoined = false
  private readonly listeners = new Set<ReactionCallback>()

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
    return () => {
      this.listeners.delete(callback)
    }
  }

  private getChannel(): RealtimeChannel {
    this.channel ??= getSupabaseClient().channel(TOPIC)
    return this.channel
  }
}
