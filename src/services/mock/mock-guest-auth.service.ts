import { setGuestName } from '@/utils/session'

import type {
  GuestAuthResult,
  GuestAuthService,
} from '@/services/contracts/guest-auth.contract'
import type { GuestUser } from '@/types/domain'

const MOCK_GUEST_STORAGE_KEY = 'instawedding_mock_guest_user'

const MOCK_GOOGLE_PROFILES: readonly GuestUser[] = [
  {
    id: 'google-guest-1',
    name: 'Mariana Costa',
    email: 'mariana.costa@gmail.com',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  },
  {
    id: 'google-guest-2',
    name: 'Rafael Almeida',
    email: 'rafael.almeida@gmail.com',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  },
]

export class MockGuestAuthService implements GuestAuthService {
  private readonly listeners = new Set<(user: GuestUser | null) => void>()

  getCurrentGuest(): GuestUser | null {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(MOCK_GUEST_STORAGE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as GuestUser
    } catch {
      return null
    }
  }

  async signInWithGoogle(): Promise<GuestAuthResult> {
    await new Promise((resolve) => setTimeout(resolve, 350))
    const profile = MOCK_GOOGLE_PROFILES[0]
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MOCK_GUEST_STORAGE_KEY, JSON.stringify(profile))
    }
    setGuestName(profile.name)
    this.notifyListeners(profile)
    return {
      success: true,
      user: profile,
    }
  }

  async logout(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(MOCK_GUEST_STORAGE_KEY)
    }
    setGuestName('')
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
