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
 * First banned term in the text, or `null`. Matches whole words, so a short
 * term does not catch longer words that contain it.
 */
export function findBannedTermInText(text: string, terms: readonly string[]): string | null {
  if (terms.length === 0) return null
  const padded = ` ${normalizeText(text)} `
  return (
    terms.find((term) => {
      const normalized = normalizeText(term)
      return normalized !== '' && padded.includes(` ${normalized} `)
    }) ?? null
  )
}

/** First banned term in the caption or the author name, or `null`. */
export function findBannedTerm(post: Post, terms: readonly string[]): string | null {
  return findBannedTermInText(`${post.authorName} ${post.caption ?? ''}`, terms)
}

/** Tells the guest why the text cannot be posted. */
export function getBannedTermMessage(term: string): string {
  return `“${term}” não é permitido na festa. Troque o texto para publicar.`
}
