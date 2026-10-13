export interface AdminAuthResult {
  readonly success: boolean
  readonly message?: string
}

export interface AdminAuthService {
  loginWithPin(pin: string): Promise<AdminAuthResult>
  checkSession(): Promise<boolean>
  logout(): Promise<void>
}
