import { getCeremonialistRepository } from '@/services/repositories.factory'

import type {
  AdminAuthResult,
  AdminAuthService,
  AdminUser,
} from '@/services/contracts/admin-auth.contract'

const STORAGE_KEY = 'instawedding_mock_admin_user'

export class MockAdminAuthService implements AdminAuthService {
  private readonly listeners = new Set<(user: AdminUser | null) => void>()

  constructor() {
    // Clean up any legacy or stale flags
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('instawedding_mock_admin_auth')
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('instawedding_mock_admin_auth')
    }
  }

  getCurrentUser(): AdminUser | null {
    if (typeof sessionStorage === 'undefined') return null
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AdminUser
    } catch {
      return null
    }
  }

  async checkSession(): Promise<boolean> {
    return this.getCurrentUser() !== null
  }

  private pendingOtp: {
    email: string
    code: string
    role: 'admin' | 'moderator'
    name: string
    exp: number
  } | null = null

  async requestOtp(
    emailInput: string
  ): Promise<{ success: boolean; message?: string; debugCode?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const email = emailInput.trim().toLowerCase()

    const masterAdminEmail = 'thmoura14@gmail.com'

    let role: 'admin' | 'moderator' = 'admin'
    let name = 'Administrador'

    if (email === masterAdminEmail) {
      role = 'admin'
      name = 'Thiago (Admin Master)'
    } else {
      const ceremonialRepo = getCeremonialistRepository()
      const isCeremonial = await ceremonialRepo.isCeremonialistEmail(email)

      const modEmails = (
        import.meta.env.VITE_MODERATOR_EMAILS ||
        'cerimonial@gmail.com,assessoria@gmail.com'
      )
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter(Boolean)

      if (isCeremonial || modEmails.includes(email)) {
        role = 'moderator'
        const username = email.split('@')[0]
        name = `${username.charAt(0).toUpperCase() + username.slice(1)} (Cerimonial)`
      } else {
        return {
          success: false,
          message: `O e-mail "${email}" não possui permissão pré-cadastrada no painel administrativo.`,
        }
      }
    }

    // Fixed mock code 123456 for predictable DX
    const code = '123456'
    this.pendingOtp = {
      email,
      code,
      role,
      name,
      exp: Date.now() + 10 * 60 * 1000,
    }

    return {
      success: true,
      message: 'Código de 6 dígitos enviado com sucesso!',
      debugCode: code,
    }
  }

  async verifyOtp(
    emailInput: string,
    codeInput: string
  ): Promise<AdminAuthResult> {
    await new Promise((resolve) => setTimeout(resolve, 250))
    const email = emailInput.trim().toLowerCase()
    const code = codeInput.trim()

    if (!this.pendingOtp || this.pendingOtp.email !== email) {
      return {
        success: false,
        message:
          'Nenhum código solicitado para este e-mail ou código expirado.',
      }
    }

    if (Date.now() > this.pendingOtp.exp) {
      this.pendingOtp = null
      return {
        success: false,
        message: 'Código expirado. Solicite um novo código de acesso.',
      }
    }

    if (this.pendingOtp.code !== code) {
      return {
        success: false,
        message: 'Código incorreto. Digite os 6 dígitos enviados.',
      }
    }

    const user: AdminUser = {
      email,
      name: this.pendingOtp.name,
      role: this.pendingOtp.role,
      avatarUrl:
        this.pendingOtp.role === 'admin'
          ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'
          : 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80',
    }

    this.pendingOtp = null
    this.persistUser(user)
    return { success: true, user }
  }

  async logout(): Promise<void> {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem('instawedding_mock_admin_auth')
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem('instawedding_mock_admin_auth')
    }
    this.notifyListeners(null)
  }

  onAuthStateChange(callback: (user: AdminUser | null) => void): () => void {
    this.listeners.add(callback)
    callback(this.getCurrentUser())

    return () => {
      this.listeners.delete(callback)
    }
  }

  private persistUser(user: AdminUser): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    }
    this.notifyListeners(user)
  }

  private notifyListeners(user: AdminUser | null): void {
    for (const listener of this.listeners) {
      try {
        listener(user)
      } catch {
        // Suppress listener errors
      }
    }
  }
}
