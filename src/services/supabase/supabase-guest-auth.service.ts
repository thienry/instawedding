import { isAuthRetryableFetchError } from '@supabase/supabase-js'

import { getSupabaseClient } from '@/services/supabase/supabase.client'
import { setGuestName } from '@/utils/session'

import type { GuestAuthResult, GuestAuthService } from '@/services/contracts/guest-auth.contract'
import type { GuestUser } from '@/types/domain'
import type { User } from '@supabase/supabase-js'

const GUEST_USER_CACHE_KEY = 'instawedding_guest_user_cache'

function mapSupabaseUserToGuest(user: User | null | undefined): GuestUser | null {
  if (!user) return null
  const metadata = user.user_metadata ?? {}
  const rawName =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    (typeof user.email === 'string' ? user.email.split('@')[0] : 'Convidado')
  const rawAvatar =
    (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
    (typeof metadata.picture === 'string' && metadata.picture) ||
    null

  return {
    id: user.id,
    name: rawName.trim(),
    email: user.email ?? '',
    avatarUrl: rawAvatar,
  }
}

export class SupabaseGuestAuthService implements GuestAuthService {
  private readonly listeners = new Set<(user: GuestUser | null) => void>()
  private currentUser: GuestUser | null = null

  constructor() {
    this.currentUser = this.readCachedUser()
    this.initAuthSubscription()
  }

  private readCachedUser(): GuestUser | null {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(GUEST_USER_CACHE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as GuestUser
    } catch {
      return null
    }
  }

  private writeCachedUser(user: GuestUser | null): void {
    this.currentUser = user
    if (typeof localStorage === 'undefined') return
    if (user) {
      localStorage.setItem(GUEST_USER_CACHE_KEY, JSON.stringify(user))
      setGuestName(user.name)
    } else {
      localStorage.removeItem(GUEST_USER_CACHE_KEY)
      setGuestName('')
    }
  }

  private initAuthSubscription(): void {
    const supabase = getSupabaseClient()

    void supabase.auth.getSession().then(({ data, error }) => {
      // The session is still stored, only its renewal could not be made
      if (error && isAuthRetryableFetchError(error)) return
      this.updateUser(mapSupabaseUserToGuest(data.session?.user))
    })

    supabase.auth.onAuthStateChange((event, session) => {
      // Without a session, only this event means that the guest left
      if (!session && event !== 'SIGNED_OUT') return
      this.updateUser(mapSupabaseUserToGuest(session?.user))
    })
  }

  /** Ignores an unchanged user: Supabase repeats it whenever the app regains focus. */
  private updateUser(user: GuestUser | null): void {
    if (JSON.stringify(user) === JSON.stringify(this.currentUser)) return
    this.writeCachedUser(user)
    this.notifyListeners(user)
  }

  getCurrentGuest(): GuestUser | null {
    return this.currentUser ?? this.readCachedUser()
  }

  async signInWithGoogle(redirectPath?: string): Promise<GuestAuthResult> {
    const supabase = getSupabaseClient()
    const targetPath =
      redirectPath ??
      (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/')
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}${targetPath}` : undefined

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      return {
        success: false,
        message: `Não foi possível conectar com o Google: ${error.message}`,
      }
    }

    return {
      success: true,
    }
  }

  async logout(): Promise<void> {
    const supabase = getSupabaseClient()
    // The default would also end the sessions of the other devices
    await supabase.auth.signOut({ scope: 'local' })
    this.writeCachedUser(null)
    this.notifyListeners(null)
  }

  onAuthStateChange(callback: (user: GuestUser | null) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private notifyListeners(user: GuestUser | null): void {
    for (const listener of this.listeners) {
      listener(user)
    }
  }
}
