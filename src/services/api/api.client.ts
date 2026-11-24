import { getSupabaseClient } from '@/services/supabase/supabase.client'

/** Authorization header of the signed-in Google guest, if any. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await getSupabaseClient().auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Calls an admin endpoint with the OTP cookie and the Google session. */
export async function adminRequest<T>(
  endpoint: 'moderate' | 'challenges' | 'ceremonialists',
  body: { readonly action: string } & Record<string, unknown>
): Promise<T> {
  const response = await fetch(`/api/admin/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok || !data) {
    const message = (data as { error?: string } | null)?.error
    throw new Error(message || 'Falha de comunicação com o servidor.')
  }
  return data as T
}
