import { adminRequest } from '@/services/api/api.client'
import { getSupabaseClient } from '@/services/supabase/supabase.client'

import type { ChallengeRepository } from '@/services/contracts/challenge-repository.contract'
import type { Challenge, CreateChallengeDTO } from '@/types/domain'

interface SupabaseChallengeRow {
  id: number
  title: string
  description: string
  icon: string
  is_active: boolean
  created_at: string
}

export class SupabaseChallengeRepository implements ChallengeRepository {
  async getChallenges(): Promise<Challenge[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('challenges')
      .select('id, title, description, icon, is_active, created_at')
      .eq('is_active', true)
      .order('id', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch challenges from Supabase: ${error.message}`)
    }

    return (data as SupabaseChallengeRow[]).map(this.mapRowToChallenge)
  }

  async getAllChallenges(): Promise<Challenge[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('challenges')
      .select('id, title, description, icon, is_active, created_at')
      .order('id', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch all challenges from Supabase: ${error.message}`)
    }

    return (data as SupabaseChallengeRow[]).map(this.mapRowToChallenge)
  }

  async getChallengeById(id: number): Promise<Challenge | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('challenges')
      .select('id, title, description, icon, is_active, created_at')
      .eq('id', id)
      .single()

    if (error || !data) return null

    return this.mapRowToChallenge(data as SupabaseChallengeRow)
  }

  async createChallenge(dto: CreateChallengeDTO): Promise<Challenge> {
    const { challenge } = await adminRequest<{
      challenge: SupabaseChallengeRow
    }>('challenges', {
      action: 'create',
      title: dto.title,
      description: dto.description,
      icon: dto.icon,
    })
    return this.mapRowToChallenge(challenge)
  }

  async setChallengeActive(id: number, isActive: boolean): Promise<void> {
    await adminRequest('challenges', { action: 'set_active', id, isActive })
  }

  async deleteChallenge(id: number): Promise<void> {
    await adminRequest('challenges', { action: 'delete', id })
  }

  private mapRowToChallenge(row: SupabaseChallengeRow): Challenge {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      icon: row.icon,
      isActive: row.is_active,
      createdAt: row.created_at,
    }
  }
}
