import type { Challenge } from '../../types/domain'
import type { ChallengeRepository } from '../contracts/challenge-repository.contract'

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
  private readonly challenges: Challenge[]

  constructor(initialData: readonly Challenge[] = INITIAL_CHALLENGES) {
    this.challenges = [...initialData]
  }

  async getChallenges(): Promise<Challenge[]> {
    return this.challenges.filter((c) => c.isActive)
  }

  async getChallengeById(id: number): Promise<Challenge | null> {
    const found = this.challenges.find((c) => c.id === id)
    return found ?? null
  }
}
