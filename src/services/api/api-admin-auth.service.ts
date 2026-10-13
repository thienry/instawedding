import { getSupabaseClient } from '../supabase/supabase.client'

import type {
  AdminAuthResult,
  AdminAuthService,
  AdminOtpRequestResult,
  AdminUser,
} from '../contracts/admin-auth.contract'

export class ApiAdminAuthService implements AdminAuthService {
  private currentUser: AdminUser | null = null
  private readonly listeners = new Set<(user: AdminUser | null) => void>()
  private isInitialized = false

  constructor() {
    this.initSupabaseListener()
  }

  getCurrentUser(): AdminUser | null {
    return this.currentUser
  }

  async checkSession(): Promise<boolean> {
    // 1. Check Supabase OAuth session
    try {
      const supabase = getSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user?.email) {
        const user = this.resolveRoleFromEmail(
          session.user.email,
          session.user.user_metadata?.full_name || 'Admin Google',
          session.user.user_metadata?.avatar_url
        )

        if (user) {
          this.setCurrentUser(user)
          return true
        }

        // Email not authorized in whitelist: sign out immediately
        await supabase.auth.signOut()
        this.setCurrentUser(null)
        return false
      }
    } catch {
      // Supabase not reachable or configured
    }

    // 2. Check Serverless admin session cookie
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = (await response.json()) as {
          authenticated: boolean
          user?: AdminUser
        }
        if (data.authenticated && data.user) {
          this.setCurrentUser(data.user)
          return true
        }
      }
    } catch {
      // API endpoint not reachable
    }

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
        this.setCurrentUser(data.user)
        return { success: true, user: data.user }
      }

      return {
        success: false,
        message:
          data.error ||
          data.message ||
          'Código inválido ou expirado. Tente novamente.',
      }
    } catch {
      return {
        success: false,
        message: 'Erro de conexão com o servidor ao validar o código OTP.',
      }
    }
  }

  async logout(): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
    } catch {
      // Ignore Supabase signout error
    }

    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Ignore API logout error
    }

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
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user?.email) {
          const user = this.resolveRoleFromEmail(
            session.user.email,
            session.user.user_metadata?.full_name || 'Admin Google',
            session.user.user_metadata?.avatar_url
          )
          this.setCurrentUser(user)
        } else if (
          !this.currentUser ||
          this.currentUser.email.includes('@gmail.com')
        ) {
          this.setCurrentUser(null)
        }
      })
    } catch {
      // Supabase listener silent failure
    }
  }

  private resolveRoleFromEmail(
    email: string,
    name: string,
    avatarUrl?: string
  ): AdminUser | null {
    const normalized = email.trim().toLowerCase()
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean)

    const modEmails = (import.meta.env.VITE_MODERATOR_EMAILS || '')
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean)

    if (adminEmails.length === 0 || adminEmails.includes(normalized)) {
      return {
        email: normalized,
        name,
        role: 'admin',
        avatarUrl,
      }
    }

    if (modEmails.includes(normalized)) {
      return {
        email: normalized,
        name,
        role: 'moderator',
        avatarUrl,
      }
    }

    return null
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
