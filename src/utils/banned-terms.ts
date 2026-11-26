import type { Post } from '@/types/domain'

/** Longest term accepted, as in the database. */
export const BANNED_TERM_MAX_LENGTH = 40

/**
 * Lower case words without accents or punctuation, separated by single spaces,
 * so "Porr@, Fulano!" and "porr fulano" compare alike.
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/**
 * First banned term in the caption or the author name, or `null`. Matches
 * whole words, so a short term does not catch longer words that contain it.
 */
export function findBannedTerm(post: Post, terms: readonly string[]): string | null {
  if (terms.length === 0) return null
  const text = ` ${normalizeText(`${post.authorName} ${post.caption ?? ''}`)} `
  return (
    terms.find((term) => {
      const normalized = normalizeText(term)
      return normalized !== '' && text.includes(` ${normalized} `)
    }) ?? null
  )
}
