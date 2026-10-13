import type { GuestSession } from '../types/domain'

const SESSION_STORAGE_KEY = 'instawedding_guest_session_id'
const GUEST_NAME_KEY = 'instawedding_guest_name'

/**
 * Retrieves the guest's session id, generating and persisting a new UUID if none exists.
 */
export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  }
  return sessionId
}

/**
 * Retrieves the guest's stored name or empty string if not yet provided.
 */
export function getGuestName(): string {
  return localStorage.getItem(GUEST_NAME_KEY) ?? ''
}

/**
 * Persists the guest's name into local storage.
 */
export function setGuestName(name: string): void {
  const trimmed = name.trim()
  if (trimmed) {
    localStorage.setItem(GUEST_NAME_KEY, trimmed)
  } else {
    localStorage.removeItem(GUEST_NAME_KEY)
  }
}

/**
 * Returns the current active guest session information.
 */
export function getGuestSession(): GuestSession {
  return {
    sessionId: getOrCreateSessionId(),
    guestName: getGuestName(),
  }
}
