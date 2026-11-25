import type { Challenge, CreateChallengeDTO } from '@/types/domain'

export interface ChallengeRepository {
  getChallenges(): Promise<Challenge[]>
  getAllChallenges(): Promise<Challenge[]>
  getChallengeById(id: number): Promise<Challenge | null>
  createChallenge(dto: CreateChallengeDTO): Promise<Challenge>
  setChallengeActive(id: number, isActive: boolean): Promise<void>
  deleteChallenge(id: number): Promise<void>
}
