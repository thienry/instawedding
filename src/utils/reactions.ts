/** Reactions guests may send to the projector, with their spoken names. */
export const REACTIONS = [
  { emoji: '❤️', label: 'Amei' },
  { emoji: '😂', label: 'Ri muito' },
  { emoji: '👏', label: 'Palmas' },
  { emoji: '🥂', label: 'Brinde' },
  { emoji: '🔥', label: 'Arrasou' },
  { emoji: '😍', label: 'Apaixonado' },
] as const

export type ReactionEmoji = (typeof REACTIONS)[number]['emoji']

/** Most reactions in one message. */
export const MAX_BATCH_SIZE = 5

const ALLOWED: ReadonlySet<unknown> = new Set(REACTIONS.map(({ emoji }) => emoji))

/** Keeps only valid reactions. Anyone can send messages, so nothing is trusted. */
export function parseReactions(payload: unknown): readonly ReactionEmoji[] {
  const emojis =
    payload && typeof payload === 'object' && 'emojis' in payload ? payload.emojis : null
  if (!Array.isArray(emojis)) return []
  return emojis
    .slice(0, MAX_BATCH_SIZE)
    .filter((emoji): emoji is ReactionEmoji => ALLOWED.has(emoji))
}
