import { authorize } from '../_lib/auth.js'
import { fail, json, readJson } from '../_lib/http.js'
import { createServiceClient } from '../_lib/supabase.js'

interface ModerateBody {
  action: 'list_posts' | 'toggle_approval' | 'delete_post' | 'clear_all'
  postId: string
}

export async function POST(req: Request): Promise<Response> {
  const user = await authorize(req)
  if (!user) return fail(401, 'Não autorizado.')

  const body = await readJson<ModerateBody>(req)
  if (!body) return fail(400, 'Corpo da requisição inválido.')
  const { action, postId } = body

  if ((action === 'delete_post' || action === 'clear_all') && user.role !== 'admin') {
    return fail(403, 'Acesso negado. Apenas administradores podem excluir fotos ou zerar o feed.')
  }
  if (
    (action === 'delete_post' || action === 'toggle_approval') &&
    (typeof postId !== 'string' || !postId)
  ) {
    return fail(400, 'postId é obrigatório')
  }

  try {
    const posts = () => createServiceClient().from('posts')

    switch (action) {
      case 'list_posts': {
        const { data, error } = await posts()
          .select('*, challenges(id, title, description, icon, is_active, created_at)')
          .order('created_at', { ascending: false })
        if (error) throw error
        return json({ posts: data })
      }
      case 'toggle_approval': {
        const { data: post, error: readError } = await posts()
          .select('is_approved')
          .eq('id', postId!)
          .maybeSingle()
        if (readError) throw readError
        if (!post) return fail(404, 'Publicação não encontrada')

        const isApproved = !post.is_approved
        const { data: updated, error } = await posts()
          .update({ is_approved: isApproved })
          .eq('id', postId!)
          .select('id')
        if (error) throw error
        if (updated.length === 0) return fail(404, 'Publicação não encontrada')
        return json({ success: true, isApproved })
      }
      case 'delete_post': {
        const { error } = await posts().delete().eq('id', postId!)
        if (error) throw error
        return json({ success: true })
      }
      case 'clear_all': {
        const { error } = await posts().delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (error) throw error
        return json({ success: true })
      }
      default:
        return fail(400, 'Ação desconhecida')
    }
  } catch (err) {
    console.error('[moderate]', err)
    return fail(500, 'Erro interno ao moderar publicações.')
  }
}
