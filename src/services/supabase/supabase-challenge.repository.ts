import { adminRequest } from '@/services/api/api.client'
import { getSupabaseClient } from '@/services/supabase/supabase.client'
import { generateUUID } from '@/utils/uuid'

import type { ChallengeRepository } from '@/services/contracts/challenge-repository.contract'
import type { UnsubscribeFunction } from '@/services/contracts/realtime.contract'
import type { Challenge, CreateChallengeDTO } from '@/types/domain'

interface SupabaseChallengeRow {
  id: number
  title: string
  description: string
  icon: string
  is_active: boolean
  created_at: string
  is_moment: boolean
  live_since: string | null
}

const COLUMNS = 'id, title, description, icon, is_active, created_at, is_moment, live_since'

export class SupabaseChallengeRepository implements ChallengeRepository {
  async getChallenges(): Promise<Challenge[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('challenges')
      .select(COLUMNS)
      .eq('is_active', true)
      .eq('is_moment', false)
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
      .select(COLUMNS)
      .order('id', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch all challenges from Supabase: ${error.message}`)
    }

    return (data as SupabaseChallengeRow[]).map(this.mapRowToChallenge)
  }

  async getChallengeById(id: number): Promise<Challenge | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('challenges').select(COLUMNS).eq('id', id).single()

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
      isMoment: dto.isMoment === true,
    })
    return this.mapRowToChallenge(challenge)
  }

  async setChallengeActive(id: number, isActive: boolean): Promise<void> {
    await adminRequest('challenges', { action: 'set_active', id, isActive })
  }

  async deleteChallenge(id: number): Promise<void> {
    await adminRequest('challenges', { action: 'delete', id })
  }

  async getLiveMoment(): Promise<Challenge | null> {
    const { data, error } = await getSupabaseClient()
      .from('challenges')
      .select(COLUMNS)
      .eq('is_moment', true)
      .not('live_since', 'is', null)
      .maybeSingle()

    if (error) throw new Error(`Failed to fetch the live moment: ${error.message}`)
    return data ? this.mapRowToChallenge(data as SupabaseChallengeRow) : null
  }

  async setMomentLive(id: number, isLive: boolean): Promise<void> {
    await adminRequest('challenges', { action: 'set_live', id, isLive })
  }

  subscribeToChanges(callback: () => void): UnsubscribeFunction {
    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`realtime-challenges-${generateUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () =>
        callback()
      )
      // Changes may have been missed while disconnected
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') callback()
      })
    return () => {
      void supabase.removeChannel(channel)
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
      isMoment: row.is_moment,
      liveSince: row.live_since,
    }
  }
}
