import type { Challenge } from '@/types/domain'

export interface ChallengeRepository {
  getChallenges(): Promise<Challenge[]>
  getChallengeById(id: number): Promise<Challenge | null>
}
