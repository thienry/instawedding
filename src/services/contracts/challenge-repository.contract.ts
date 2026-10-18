import type { Challenge, CreateChallengeDTO } from '@/types/domain'

export interface ChallengeRepository {
  getChallenges(): Promise<Challenge[]>
  getAllChallenges(): Promise<Challenge[]>
  getChallengeById(id: number): Promise<Challenge | null>
  createChallenge(dto: CreateChallengeDTO): Promise<Challenge>
  toggleChallengeActive(id: number): Promise<boolean>
  deleteChallenge(id: number): Promise<void>
}
