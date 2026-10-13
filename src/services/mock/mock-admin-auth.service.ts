import type {
  AdminAuthResult,
  AdminAuthService,
} from '../contracts/admin-auth.contract'

const STORAGE_KEY = 'instawedding_admin_session'

export class MockAdminAuthService implements AdminAuthService {
  private readonly defaultPin: string

  constructor() {
    this.defaultPin = import.meta.env.VITE_MOCK_ADMIN_PIN || '2026'
  }

  async loginWithPin(pin: string): Promise<AdminAuthResult> {
    // Simulate slight network/hashing delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    if (pin === this.defaultPin) {
      sessionStorage.setItem(STORAGE_KEY, 'true')
      return { success: true }
    }

    return { success: false, message: 'PIN incorreto. Tente novamente.' }
  }

  async checkSession(): Promise<boolean> {
    return sessionStorage.getItem(STORAGE_KEY) === 'true'
  }

  async logout(): Promise<void> {
    sessionStorage.removeItem(STORAGE_KEY)
  }
}
