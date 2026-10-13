import type {
  AdminAuthResult,
  AdminAuthService,
} from '../contracts/admin-auth.contract'

export class ApiAdminAuthService implements AdminAuthService {
  async loginWithPin(pin: string): Promise<AdminAuthResult> {
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
        credentials: 'include',
      })

      if (response.ok) {
        return { success: true }
      }

      const data = await response.json().catch(() => ({}))
      return {
        success: false,
        message: data.message || 'PIN inválido ou acesso não autorizado.',
      }
    } catch {
      return {
        success: false,
        message: 'Falha na comunicação com o servidor de autenticação.',
      }
    }
  }

  async checkSession(): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'GET',
        credentials: 'include',
      })
      return response.ok
    } catch {
      return false
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore network errors during logout
    }
  }
}
