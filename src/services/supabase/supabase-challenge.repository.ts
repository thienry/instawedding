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
      throw new Error(
        `Failed to fetch challenges from Supabase: ${error.message}`
      )
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
      throw new Error(
        `Failed to fetch all challenges from Supabase: ${error.message}`
      )
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
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('challenges')
      .insert({
        title: dto.title.trim(),
        description: dto.description.trim(),
        icon: dto.icon.trim() || '✨',
        is_active: true,
      })
      .select('id, title, description, icon, is_active, created_at')
      .single()

    if (error || !data) {
      throw new Error(
        `Failed to create challenge in Supabase: ${error?.message ?? 'Unknown error'}`
      )
    }

    return this.mapRowToChallenge(data as SupabaseChallengeRow)
  }

  async toggleChallengeActive(id: number): Promise<boolean> {
    const supabase = getSupabaseClient()
    const { data: existing, error: fetchError } = await supabase
      .from('challenges')
      .select('is_active')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      throw new Error('Challenge not found')
    }

    const newStatus = !existing.is_active
    const { error: updateError } = await supabase
      .from('challenges')
      .update({ is_active: newStatus })
      .eq('id', id)

    if (updateError) {
      throw new Error(`Failed to toggle challenge: ${updateError.message}`)
    }

    return newStatus
  }

  async deleteChallenge(id: number): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('challenges').delete().eq('id', id)
    if (error) {
      throw new Error(`Failed to delete challenge: ${error.message}`)
    }
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
