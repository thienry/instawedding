import type { ChallengeRepository } from '@/services/contracts/challenge-repository.contract'
import type { Challenge, CreateChallengeDTO } from '@/types/domain'

const CHALLENGES_STORAGE_KEY = 'instawedding_mock_challenges'

export const INITIAL_CHALLENGES: readonly Challenge[] = [
  {
    id: 1,
    title: 'Um Brinde Especial',
    description: 'Tire uma foto levantando a taça para brindar com sua mesa!',
    icon: '🥂',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
  },
  {
    id: 2,
    title: 'Pista de Dança',
    description: 'Capture o melhor ou o mais engraçado passo na pista!',
    icon: '🕺',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
  },
  {
    id: 3,
    title: 'Olhar dos Noivos',
    description: 'Um clique espontâneo e carinhoso do casal.',
    icon: '💍',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
  },
  {
    id: 4,
    title: 'Mesa de Doces',
    description: 'Mostre seu doce ou pedaço de bolo favorito da festa!',
    icon: '🍰',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
  },
  {
    id: 5,
    title: 'Novos Amigos',
    description: 'Foto em grupo com convidados que você conheceu hoje.',
    icon: '🤝',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
  },
]

export class MockChallengeRepository implements ChallengeRepository {
  private readonly fallbackChallenges: Challenge[]

  constructor(initialData: readonly Challenge[] = INITIAL_CHALLENGES) {
    this.fallbackChallenges = [...initialData]
    this.ensureInitialData()
  }

  private ensureInitialData(): void {
    if (typeof localStorage === 'undefined') return
    if (!localStorage.getItem(CHALLENGES_STORAGE_KEY)) {
      localStorage.setItem(CHALLENGES_STORAGE_KEY, JSON.stringify(this.fallbackChallenges))
    }
  }

  private readAll(): Challenge[] {
    if (typeof localStorage === 'undefined') return [...this.fallbackChallenges]
    const raw = localStorage.getItem(CHALLENGES_STORAGE_KEY)
    if (!raw) return [...this.fallbackChallenges]
    try {
      return JSON.parse(raw) as Challenge[]
    } catch {
      return [...this.fallbackChallenges]
    }
  }

  private saveAll(list: Challenge[]): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CHALLENGES_STORAGE_KEY, JSON.stringify(list))
    }
  }

  async getChallenges(): Promise<Challenge[]> {
    return this.readAll().filter((c) => c.isActive)
  }

  async getAllChallenges(): Promise<Challenge[]> {
    return this.readAll()
  }

  async getChallengeById(id: number): Promise<Challenge | null> {
    const found = this.readAll().find((c) => c.id === id)
    return found ?? null
  }

  async createChallenge(dto: CreateChallengeDTO): Promise<Challenge> {
    const all = this.readAll()
    const maxId = all.reduce((acc, item) => Math.max(acc, item.id), 0)
    const created: Challenge = {
      id: maxId + 1,
      title: dto.title.trim(),
      description: dto.description.trim(),
      icon: dto.icon.trim() || '✨',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    all.push(created)
    this.saveAll(all)
    return created
  }

  async toggleChallengeActive(id: number): Promise<boolean> {
    const all = this.readAll()
    let newStatus = false
    const updated = all.map((c) => {
      if (c.id === id) {
        newStatus = !c.isActive
        return { ...c, isActive: newStatus }
      }
      return c
    })
    this.saveAll(updated)
    return newStatus
  }

  async deleteChallenge(id: number): Promise<void> {
    const all = this.readAll().filter((c) => c.id !== id)
    this.saveAll(all)
  }
}
