import type { UnsubscribeFunction } from '@/services/contracts/realtime.contract'
import type { ReactionEmoji } from '@/utils/reactions'

export type ReactionCallback = (emojis: readonly ReactionEmoji[]) => void

export type ProjectorCallback = (isActive: boolean) => void

/** Live reactions, from the guests to the projector. Nothing is stored. */
export interface ReactionService {
  send(emojis: readonly ReactionEmoji[]): Promise<void>
  /** Receives reactions and, meanwhile, announces that a projector is active. */
  subscribe(callback: ReactionCallback): UnsubscribeFunction
  /** Tells whether any projector is receiving reactions, now and on every change. */
  watchProjector(callback: ProjectorCallback): UnsubscribeFunction
}
