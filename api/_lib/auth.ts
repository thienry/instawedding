import process from 'node:process'

import { getAdminTokenFromRequest, verifyAdminToken } from './security.js'
import { createServiceClient, getBearerUser } from './supabase.js'

import type { UserRole } from './security.js'

export interface AdminIdentity {
  readonly email: string
  readonly name: string
  readonly role: UserRole
}

const normalize = (email: string) => email.toLowerCase().trim()

export async function resolveUserRole(email: string): Promise<AdminIdentity | null> {
  const normalized = normalize(email)
  const fallback = 'thmoura14@gmail.com'
  const master = normalize(
    (process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || fallback).split(',')[0] ||
      fallback
  )

  if (normalized === master) {
    return { email: normalized, role: 'admin', name: 'Thiago (Admin Master)' }
  }

  try {
    const { data } = await createServiceClient()
      .from('ceremonialists')
      .select('name')
      .eq('email', normalized)
      .maybeSingle()
    if (data) {
      const name = data.name?.trim()
      return {
        email: normalized,
        role: 'moderator',
        name: name ? `${name} (Cerimonial)` : 'Equipe Cerimonial',
      }
    }
  } catch {
    // Not configured: fall through to the static list
  }

  const moderators = (process.env.MODERATOR_EMAILS || process.env.VITE_MODERATOR_EMAILS || '')
    .split(',')
    .map(normalize)
    .filter(Boolean)
  if (moderators.includes(normalized)) {
    const username = normalized.split('@')[0] ?? ''
    return {
      email: normalized,
      role: 'moderator',
      name: `${username.charAt(0).toUpperCase()}${username.slice(1)} (Cerimonial)`,
    }
  }

  return null
}

/**
 * Identifies the admin or moderator by Google session (bearer) or OTP cookie.
 * Roles are resolved on every call, so a revoked moderator loses access now.
 */
export async function authorize(req: Request): Promise<AdminIdentity | null> {
  const candidates: string[] = []

  const user = await getBearerUser(req).catch(() => null)
  if (user?.email && user.email_confirmed_at) candidates.push(user.email)

  const token = getAdminTokenFromRequest(req)
  const payload = token ? verifyAdminToken(token) : null
  if (payload) candidates.push(payload.email)

  const identities = await Promise.all(candidates.map(resolveUserRole))
  return identities.find((i) => i?.role === 'admin') ?? identities.find((i) => i !== null) ?? null
}
