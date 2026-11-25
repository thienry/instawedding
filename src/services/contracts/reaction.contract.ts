import type { UnsubscribeFunction } from '@/services/contracts/realtime.contract'
import type { ReactionEmoji } from '@/utils/reactions'

export type ReactionCallback = (emojis: readonly ReactionEmoji[]) => void

/** Live reactions, from the guests to the projector. Nothing is stored. */
export interface ReactionService {
  send(emojis: readonly ReactionEmoji[]): Promise<void>
  subscribe(callback: ReactionCallback): UnsubscribeFunction
}
