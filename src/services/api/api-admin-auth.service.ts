import { getSupabaseClient } from '@/services/supabase/supabase.client'

import type {
  AdminAuthResult,
  AdminAuthService,
  AdminOtpRequestResult,
  AdminUser,
} from '@/services/contracts/admin-auth.contract'
import type { Session } from '@supabase/supabase-js'

export class ApiAdminAuthService implements AdminAuthService {
  private currentUser: AdminUser | null = null
  private authSource: 'oauth' | 'cookie' | null = null
  private readonly listeners = new Set<(user: AdminUser | null) => void>()
  private isInitialized = false

  constructor() {
    this.initSupabaseListener()
  }

  getCurrentUser(): AdminUser | null {
    return this.currentUser
  }

  async checkSession(): Promise<boolean> {
    // The server accepts the Google session or the OTP cookie
    let session: Session | null = null
    try {
      const { data } = await getSupabaseClient().auth.getSession()
      session = data.session
    } catch {
      // Supabase not reachable or configured
    }

    const user = await this.fetchIdentity(session)
    if (user) {
      this.authSource = this.isFromSession(user, session) ? 'oauth' : 'cookie'
      this.setCurrentUser(user)
      return true
    }

    this.authSource = null
    this.setCurrentUser(null)
    return false
  }

  async requestOtp(email: string): Promise<AdminOtpRequestResult> {
    try {
      const response = await fetch('/api/admin/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email }),
        credentials: 'include',
      })

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean
        message?: string
        error?: string
        debugCode?: string
      }

      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message || 'Código de acesso enviado para seu e-mail.',
          debugCode: data.debugCode,
        }
      }

      return {
        success: false,
        message:
          data.error ||
          data.message ||
          'Falha ao solicitar código de acesso. Verifique o e-mail informado.',
      }
    } catch {
      return {
        success: false,
        message: 'Erro de conexão com o servidor ao solicitar código OTP.',
      }
    }
  }

  async verifyOtp(email: string, code: string): Promise<AdminAuthResult> {
    try {
      const response = await fetch('/api/admin/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, code }),
        credentials: 'include',
      })

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean
        user?: AdminUser
        error?: string
        message?: string
      }

      if (response.ok && data.success && data.user) {
        this.authSource = 'cookie'
        this.setCurrentUser(data.user)
        return { success: true, user: data.user }
      }

      return {
        success: false,
        message: data.error || data.message || 'Código inválido ou expirado. Tente novamente.',
      }
    } catch {
      return {
        success: false,
        message: 'Erro de conexão com o servidor ao validar o código OTP.',
      }
    }
  }

  async logout(): Promise<void> {
    if (this.authSource === 'oauth') {
      try {
        const supabase = getSupabaseClient()
        await supabase.auth.signOut()
      } catch {
        // Ignore Supabase signout error
      }
    }

    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore API logout error
    }

    this.authSource = null
    this.setCurrentUser(null)
  }

  onAuthStateChange(callback: (user: AdminUser | null) => void): () => void {
    this.listeners.add(callback)
    callback(this.currentUser)

    return () => {
      this.listeners.delete(callback)
    }
  }

  private initSupabaseListener(): void {
    if (this.isInitialized) return
    this.isInitialized = true

    try {
      const supabase = getSupabaseClient()
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.email) {
          void this.fetchIdentity(session).then((user) => {
            if (user) {
              this.authSource = this.isFromSession(user, session) ? 'oauth' : 'cookie'
              this.setCurrentUser(user)
            } else if (this.authSource === 'oauth') {
              this.authSource = null
              this.setCurrentUser(null)
            }
          })
        } else if (this.authSource === 'oauth') {
          this.authSource = null
          this.setCurrentUser(null)
        }
      })
    } catch {
      // Supabase listener silent failure
    }
  }

  private isFromSession(user: AdminUser, session: Session | null): boolean {
    return session?.user.email?.trim().toLowerCase() === user.email
  }

  private async fetchIdentity(session: Session | null): Promise<AdminUser | null> {
    try {
      const response = await fetch('/api/admin/auth', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        credentials: 'include',
      })
      if (!response.ok) return null
      const { user } = (await response.json()) as { user?: AdminUser }
      if (!user) return null
      if (!this.isFromSession(user, session)) return user

      const metadata = session?.user.user_metadata
      return {
        ...user,
        name: metadata?.full_name || user.name,
        avatarUrl: metadata?.avatar_url,
      }
    } catch {
      return null
    }
  }

  private setCurrentUser(user: AdminUser | null): void {
    this.currentUser = user
    for (const listener of this.listeners) {
      try {
        listener(user)
      } catch {
        // Suppress listener error
      }
    }
  }
}
