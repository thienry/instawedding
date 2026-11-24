import type { Ceremonialist, CreateCeremonialistDTO } from '@/types/domain'

export interface CeremonialistRepository {
  getCeremonialists(): Promise<Ceremonialist[]>
  addCeremonialist(dto: CreateCeremonialistDTO): Promise<Ceremonialist>
  removeCeremonialist(id: string): Promise<void>
}
