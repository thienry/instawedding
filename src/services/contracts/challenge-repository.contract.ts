import type { UnsubscribeFunction } from '@/services/contracts/realtime.contract'
import type { Challenge, CreateChallengeDTO } from '@/types/domain'

export interface ChallengeRepository {
  /** Active challenges for the guests, without the moments. */
  getChallenges(): Promise<Challenge[]>
  /** Every challenge and moment, for the admin. */
  getAllChallenges(): Promise<Challenge[]>
  getChallengeById(id: number): Promise<Challenge | null>
  createChallenge(dto: CreateChallengeDTO): Promise<Challenge>
  setChallengeActive(id: number, isActive: boolean): Promise<void>
  deleteChallenge(id: number): Promise<void>
  /**
   * Moment on air or counting down, even if it has timed out (see
   * `src/utils/moments.ts`).
   */
  getLiveMoment(): Promise<Challenge | null>
  /**
   * Puts a moment on air, ending any other, or takes it off.
   *
   * @param delayMinutes - Countdown before it goes on air.
   */
  setMomentLive(id: number, isLive: boolean, delayMinutes?: number): Promise<void>
  /** Calls back whenever a challenge or moment may have changed. */
  subscribeToChanges(callback: () => void): UnsubscribeFunction
}
