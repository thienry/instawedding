export type UserRole = 'guest' | 'moderator' | 'admin'

export interface AdminUser {
  readonly email: string
  readonly name: string
  readonly role: UserRole
  readonly avatarUrl?: string
}

export interface AdminAuthResult {
  readonly success: boolean
  readonly user?: AdminUser
  readonly message?: string
}

export interface AdminOtpRequestResult {
  readonly success: boolean
  readonly message?: string
  readonly debugCode?: string
}

export interface AdminAuthService {
  requestOtp(email: string): Promise<AdminOtpRequestResult>
  verifyOtp(email: string, code: string): Promise<AdminAuthResult>
  getCurrentUser(): AdminUser | null
  checkSession(): Promise<boolean>
  logout(): Promise<void>
  onAuthStateChange(callback: (user: AdminUser | null) => void): () => void
}
