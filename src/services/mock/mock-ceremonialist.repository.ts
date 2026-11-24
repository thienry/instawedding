import { generateUUID } from '@/utils/uuid'

import type { CeremonialistRepository } from '@/services/contracts/ceremonialist-repository.contract'
import type { Ceremonialist, CreateCeremonialistDTO } from '@/types/domain'

const STORAGE_KEY = 'instawedding_mock_ceremonialists'

const INITIAL_MOCK_CEREMONIALISTS: Ceremonialist[] = [
  {
    id: 'mock-ceremonial-1',
    email: 'cerimonial@gmail.com',
    name: 'Equipe de Cerimonial',
    createdAt: new Date().toISOString(),
    createdBy: 'admin@example.com',
  },
  {
    id: 'mock-ceremonial-2',
    email: 'assessoria@gmail.com',
    name: 'Assessoria do Evento',
    createdAt: new Date().toISOString(),
    createdBy: 'admin@example.com',
  },
]

export class MockCeremonialistRepository implements CeremonialistRepository {
  private readStorage(): Ceremonialist[] {
    if (typeof localStorage === 'undefined') return INITIAL_MOCK_CEREMONIALISTS
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      this.writeStorage(INITIAL_MOCK_CEREMONIALISTS)
      return INITIAL_MOCK_CEREMONIALISTS
    }
    try {
      return JSON.parse(raw) as Ceremonialist[]
    } catch {
      return INITIAL_MOCK_CEREMONIALISTS
    }
  }

  private writeStorage(list: Ceremonialist[]): void {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }

  async getCeremonialists(): Promise<Ceremonialist[]> {
    await new Promise((resolve) => setTimeout(resolve, 150))
    return this.readStorage()
  }

  async addCeremonialist(dto: CreateCeremonialistDTO): Promise<Ceremonialist> {
    await new Promise((resolve) => setTimeout(resolve, 150))
    const list = this.readStorage()
    const normalizedEmail = dto.email.trim().toLowerCase()

    if (list.some((c) => c.email.toLowerCase() === normalizedEmail)) {
      throw new Error(`O e-mail "${normalizedEmail}" já está cadastrado como cerimonialista.`)
    }

    const newItem: Ceremonialist = {
      id: generateUUID(),
      email: normalizedEmail,
      name: dto.name?.trim() || null,
      createdAt: new Date().toISOString(),
      createdBy: 'admin@example.com',
    }

    const updated = [newItem, ...list]
    this.writeStorage(updated)
    return newItem
  }

  async removeCeremonialist(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150))
    const list = this.readStorage()
    const updated = list.filter((c) => c.id !== id)
    this.writeStorage(updated)
  }
}
