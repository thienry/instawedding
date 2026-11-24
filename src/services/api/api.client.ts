import { getSupabaseClient } from '@/services/supabase/supabase.client'

/** Authorization header of the signed-in Google guest, if any. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await getSupabaseClient().auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
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

/** Calls an admin endpoint with the OTP cookie and the Google session. */
export function adminRequest<T>(
  endpoint: 'moderate' | 'challenges' | 'ceremonialists',
  body: { readonly action: string } & Record<string, unknown>
): Promise<T> {
  return request(`/api/admin/${endpoint}`, body)
}

/** Deletes a post of the signed-in guest. */
export async function deleteOwnPost(postId: string): Promise<void> {
  await request('/api/delete-post', { postId })
}
