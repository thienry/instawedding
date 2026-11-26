import { normalizeText } from '@/utils/banned-terms'

import type { BannedTermRepository } from '@/services/contracts/banned-term-repository.contract'

const STORAGE_KEY = 'instawedding_mock_banned_terms'

export class MockBannedTermRepository implements BannedTermRepository {
  private memory: readonly string[] = []

  private read(): readonly string[] {
    if (typeof localStorage === 'undefined') return this.memory
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
    } catch {
      return []
    }
  }

  private save(terms: readonly string[]): void {
    const sorted = [...new Set(terms)].sort((a, b) => a.localeCompare(b))
    if (typeof localStorage === 'undefined') this.memory = sorted
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
  }

  async getTerms(): Promise<readonly string[]> {
    return this.read()
  }

  async addTerm(term: string): Promise<string> {
    const normalized = normalizeText(term)
    if (!normalized) throw new Error('Empty term')
    this.save([...this.read(), normalized])
    return normalized
  }

  async removeTerm(term: string): Promise<void> {
    this.save(this.read().filter((stored) => stored !== term))
  }
}
