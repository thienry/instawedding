import { fail, json, readJson } from './_lib/http.js'
import { deleteMedia } from './_lib/media.js'
import { createServiceClient, getBearerUser } from './_lib/supabase.js'

/** Deletes a post of the signed-in guest, with its media. */
export async function POST(req: Request): Promise<Response> {
  try {
    const user = await getBearerUser(req)
    if (!user) return fail(401, 'Entre com sua conta Google para excluir.')

    const body = await readJson<{ postId: string }>(req)
    const postId = body?.postId
    if (typeof postId !== 'string' || !/^[0-9a-f-]{36}$/i.test(postId)) {
      return fail(400, 'postId é obrigatório')
    }

    const posts = () => createServiceClient().from('posts')
    const { data: deleted, error } = await posts()
      .delete()
      .eq('id', postId)
      .eq('client_session_id', user.id)
      .select('media_url')
    if (error) throw error

    if (deleted.length === 0) {
      const { data: others, error: readError } = await posts().select('id').eq('id', postId)
      if (readError) throw readError
      // Already gone is what the guest wanted
      if (others.length > 0) return fail(403, 'Você só pode excluir suas publicações.')
    }

    await deleteMedia(deleted.map((post) => post.media_url as string))
    return json({ success: true })
  } catch (error) {
    console.error('[delete-post]', error)
    return fail(500, 'Não foi possível excluir. Tente novamente.')
  }
}
