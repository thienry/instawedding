import { getSupabaseClient } from '@/services/supabase/supabase.client'

import type { CeremonialistRepository } from '@/services/contracts/ceremonialist-repository.contract'
import type { Ceremonialist, CreateCeremonialistDTO } from '@/types/domain'

interface SupabaseCeremonialistRow {
  id: string
  email: string
  name: string | null
  created_at: string
  created_by: string
}

export class SupabaseCeremonialistRepository implements CeremonialistRepository {
  async getCeremonialists(): Promise<Ceremonialist[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('ceremonialists')
      .select('id, email, name, created_at, created_by')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch ceremonialists: ${error.message}`)
    }

    return (data as SupabaseCeremonialistRow[]).map(this.mapRowToCeremonialist)
  }

  async addCeremonialist(dto: CreateCeremonialistDTO): Promise<Ceremonialist> {
    const supabase = getSupabaseClient()
    const normalizedEmail = dto.email.trim().toLowerCase()

    const { data, error } = await supabase
      .from('ceremonialists')
      .insert({
        email: normalizedEmail,
        name: dto.name?.trim() || null,
        created_by: 'thmoura14@gmail.com',
      })
      .select('id, email, name, created_at, created_by')
      .single()

    if (error) {
      throw new Error(`Failed to add ceremonialist: ${error.message}`)
    }

    return this.mapRowToCeremonialist(data as SupabaseCeremonialistRow)
  }

  async removeCeremonialist(id: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('ceremonialists')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to remove ceremonialist: ${error.message}`)
    }
  }

  async isCeremonialistEmail(email: string): Promise<boolean> {
    const supabase = getSupabaseClient()
    const normalizedEmail = email.trim().toLowerCase()

    const { data, error } = await supabase
      .from('ceremonialists')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (error) return false
    return Boolean(data)
  }

  private mapRowToCeremonialist(row: SupabaseCeremonialistRow): Ceremonialist {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.created_at,
      createdBy: row.created_by,
    }
  }
}
