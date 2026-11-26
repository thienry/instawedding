import type { ChallengeRepository } from '@/services/contracts/challenge-repository.contract'
import type { UnsubscribeFunction } from '@/services/contracts/realtime.contract'
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
  {
    id: 6,
    title: 'Entrada dos Noivos',
    description: 'Mande seu post da entrada dos noivos!',
    icon: '💒',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
    isMoment: true,
    liveSince: null,
  },
  {
    id: 7,
    title: 'Primeira Dança',
    description: 'Mande seu post da primeira dança!',
    icon: '💃',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
    isMoment: true,
    liveSince: null,
  },
  {
    id: 8,
    title: 'Brinde',
    description: 'Mande seu post do brinde!',
    icon: '🥂',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
    isMoment: true,
    liveSince: null,
  },
  {
    id: 9,
    title: 'Corte do Bolo',
    description: 'Mande seu post do corte do bolo!',
    icon: '🎂',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
    isMoment: true,
    liveSince: null,
  },
  {
    id: 10,
    title: 'Buquê',
    description: 'Mande seu post da hora do buquê!',
    icon: '💐',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
    isMoment: true,
    liveSince: null,
  },
]

export class MockChallengeRepository implements ChallengeRepository {
  private readonly fallbackChallenges: Challenge[]
  private readonly listeners = new Set<() => void>()

  constructor(initialData: readonly Challenge[] = INITIAL_CHALLENGES) {
    this.fallbackChallenges = [...initialData]
    this.ensureInitialData()
    if (typeof window !== 'undefined') {
      // Changes made in other tabs, such as the admin
      window.addEventListener('storage', (event) => {
        if (event.key === CHALLENGES_STORAGE_KEY) this.notify()
      })
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
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
    } else {
      this.fallbackChallenges.splice(0, this.fallbackChallenges.length, ...list)
    }
    this.notify()
  }

  async getChallenges(): Promise<Challenge[]> {
    return this.readAll().filter((c) => c.isActive && !c.isMoment)
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
      isMoment: dto.isMoment === true,
      liveSince: null,
    }
    all.push(created)
    this.saveAll(all)
    return created
  }

  async setChallengeActive(id: number, isActive: boolean): Promise<void> {
    this.saveAll(this.readAll().map((c) => (c.id === id ? { ...c, isActive } : c)))
  }

  async deleteChallenge(id: number): Promise<void> {
    const all = this.readAll().filter((c) => c.id !== id)
    this.saveAll(all)
  }

  async getLiveMoment(): Promise<Challenge | null> {
    return this.readAll().find((c) => c.isMoment && c.liveSince) ?? null
  }

  async setMomentLive(id: number, isLive: boolean): Promise<void> {
    const liveSince = new Date().toISOString()
    this.saveAll(
      this.readAll().map((c) => {
        if (c.id === id) return { ...c, liveSince: isLive && c.isMoment ? liveSince : null }
        return isLive && c.liveSince ? { ...c, liveSince: null } : c
      })
    )
  }

  subscribeToChanges(callback: () => void): UnsubscribeFunction {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }
}
