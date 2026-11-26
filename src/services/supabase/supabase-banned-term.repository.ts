import { adminRequest } from '@/services/api/api.client'
import { getSupabaseClient } from '@/services/supabase/supabase.client'

import type { BannedTermRepository } from '@/services/contracts/banned-term-repository.contract'

/** Everyone reads the terms; only moderators change them, through the admin API. */
export class SupabaseBannedTermRepository implements BannedTermRepository {
  async getTerms(): Promise<readonly string[]> {
    const { data, error } = await getSupabaseClient()
      .from('banned_terms')
      .select('term')
      .order('term')
    if (error) throw new Error(`Failed to fetch banned terms: ${error.message}`)
    return (data as { term: string }[]).map(({ term }) => term)
  }

  async addTerm(term: string): Promise<string> {
    const { term: stored } = await adminRequest<{ term: string }>('moderate', {
      action: 'add_term',
      term,
    })
    return stored
  }

  async removeTerm(term: string): Promise<void> {
    await adminRequest('moderate', { action: 'remove_term', term })
  }
}
