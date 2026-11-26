/**
 * Terms that guests cannot post and that keep a post off the projector.
 * Everyone reads them; only moderators change them.
 */
export interface BannedTermRepository {
  /** Every term, normalized (see `src/utils/banned-terms.ts`), in alphabetical order. */
  getTerms(): Promise<readonly string[]>
  /** Adds a term and returns it normalized, as stored. */
  addTerm(term: string): Promise<string>
  removeTerm(term: string): Promise<void>
}
