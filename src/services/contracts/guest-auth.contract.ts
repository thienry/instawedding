import type { GuestUser } from '@/types/domain'

export interface GuestAuthResult {
  readonly success: boolean
  readonly user?: GuestUser
  readonly message?: string
}

export interface GuestAuthService {
  signInWithGoogle(redirectPath?: string): Promise<GuestAuthResult>
  logout(): Promise<void>
  getCurrentGuest(): GuestUser | null
  onAuthStateChange(callback: (user: GuestUser | null) => void): () => void
}
