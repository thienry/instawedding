import { ApiAdminAuthService } from '@/services/api/api-admin-auth.service'
import { MockAdminAuthService } from '@/services/mock/mock-admin-auth.service'

import type { AdminAuthService } from '@/services/contracts/admin-auth.contract'

let adminAuthInstance: AdminAuthService | null = null

export function getAdminAuthService(): AdminAuthService {
  if (!adminAuthInstance) {
    const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'
    adminAuthInstance = useMocks ? new MockAdminAuthService() : new ApiAdminAuthService()
  }
  return adminAuthInstance
}
