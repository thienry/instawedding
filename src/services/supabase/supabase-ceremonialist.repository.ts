import { adminRequest } from '@/services/api/api.client'

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
    const { ceremonialists } = await adminRequest<{
      ceremonialists: SupabaseCeremonialistRow[]
    }>('ceremonialists', { action: 'list' })
    return ceremonialists.map(this.mapRowToCeremonialist)
  }

  async addCeremonialist(dto: CreateCeremonialistDTO): Promise<Ceremonialist> {
    const { ceremonialist } = await adminRequest<{
      ceremonialist: SupabaseCeremonialistRow
    }>('ceremonialists', { action: 'add', email: dto.email, name: dto.name })
    return this.mapRowToCeremonialist(ceremonialist)
  }

  async removeCeremonialist(id: string): Promise<void> {
    await adminRequest('ceremonialists', { action: 'remove', id })
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
