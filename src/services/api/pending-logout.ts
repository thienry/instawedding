const PENDING_KEY = 'instawedding_admin_logout_pending'

/** Remembers a logout, since only the server can remove the OTP cookie. */
export function markLogoutPending(): void {
  localStorage.setItem(PENDING_KEY, '1')
}

/** Forgets the logout, such as after a new login. */
export function clearPendingLogout(): void {
  localStorage.removeItem(PENDING_KEY)
}

/** Finishes a logout left pending. Resolves to whether none is left. */
export async function finishPendingLogout(): Promise<boolean> {
  if (!localStorage.getItem(PENDING_KEY)) return true
  try {
    const response = await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
    if (!response.ok) return false
  } catch {
    return false
  }
  clearPendingLogout()
  return true
}
