import { adminRequest } from '@/services/api/api.client'

import type { BannedTermRepository } from '@/services/contracts/banned-term-repository.contract'

export class ApiBannedTermRepository implements BannedTermRepository {
  async getTerms(): Promise<readonly string[]> {
    const { terms } = await adminRequest<{ terms: string[] }>('moderate', { action: 'list_terms' })
    return terms
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
