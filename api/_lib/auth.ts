import process from 'node:process'

import { fail } from './http.js'
import { getAdminTokenFromRequest, isDeployed, verifyAdminToken } from './security.js'
import { createServiceClient, getBearerUser } from './supabase.js'

import type { UserRole } from './security.js'

export interface AdminIdentity {
  readonly email: string
  readonly name: string
  readonly role: UserRole
}

const normalize = (email: string) => email.toLowerCase().trim()

/** Throws when the role is unknown because the database is unreachable. */
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

  let failure: unknown = null
  try {
    const { data, error } = await createServiceClient()
      .from('ceremonialists')
      .select('name')
      .eq('email', normalized)
      .maybeSingle()
    failure = error
    if (data) {
      const name = data.name?.trim()
      return {
        email: normalized,
        role: 'moderator',
        name: name ? `${name} (Cerimonial)` : 'Equipe Cerimonial',
      }
    }
  } catch (error) {
    failure = error
  }

  // The static list still works without the database

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

  // Local development works without a database
  if (failure && isDeployed()) throw failure
  return null
}

/**
 * Identifies the admin or moderator by Google session (bearer) or OTP cookie.
 * Roles are resolved on every call, so a revoked moderator loses access now.
 * Throws when nobody was identified but a lookup failed.
 */
export async function authorize(req: Request): Promise<AdminIdentity | null> {
  const candidates: string[] = []

  let failure: unknown = null

  const user = await getBearerUser(req).catch((error: unknown) => {
    failure = error
    return null
  })
  if (user?.email && user.email_confirmed_at) candidates.push(user.email)

  const token = getAdminTokenFromRequest(req)
  const payload = token ? verifyAdminToken(token) : null
  if (payload) candidates.push(payload.email)

  const identities: AdminIdentity[] = []
  for (const result of await Promise.allSettled(candidates.map(resolveUserRole))) {
    if (result.status === 'rejected') failure = result.reason
    else if (result.value) identities.push(result.value)
  }

  const identity = identities.find(({ role }) => role === 'admin') ?? identities[0] ?? null
  if (!identity && failure && isDeployed()) throw failure
  return identity
}

/** Like {@link authorize}, but answers the request when nobody is identified. */
export async function requireIdentity(req: Request): Promise<AdminIdentity | Response> {
  try {
    return (await authorize(req)) ?? fail(401, 'Não autorizado.')
  } catch (error) {
    console.error('[auth]', error)
    return fail(503, 'Serviço indisponível no momento. Tente novamente.')
  }
}
