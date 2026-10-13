import { generateUUID } from './uuid'

import type { GuestSession } from '../types/domain'

const SESSION_STORAGE_KEY = 'instawedding_guest_session_id'
const GUEST_NAME_KEY = 'instawedding_guest_name'
const TERMS_ACCEPTED_KEY = 'instawedding_terms_accepted_at'

/**
 * Retrieves the guest's session id, generating and persisting a new UUID if none exists.
 */
export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!sessionId) {
    sessionId = generateUUID()
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
 * Retrieves the ISO timestamp when the guest accepted the terms, or null if pending.
 */
export function getTermsAcceptedAt(): string | null {
  return localStorage.getItem(TERMS_ACCEPTED_KEY)
}

/**
 * Persists the guest's consent to the terms of service and privacy policy.
 */
export function setTermsAccepted(accepted: boolean = true): void {
  if (accepted) {
    localStorage.setItem(TERMS_ACCEPTED_KEY, new Date().toISOString())
  } else {
    localStorage.removeItem(TERMS_ACCEPTED_KEY)
  }
}

/**
 * Returns the current active guest session information.
 */
export function getGuestSession(): GuestSession {
  return {
    sessionId: getOrCreateSessionId(),
    guestName: getGuestName(),
    termsAcceptedAt: getTermsAcceptedAt(),
  }
}
