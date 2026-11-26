import { requireIdentity } from '../_lib/auth.js'
import { fail, json, readJson } from '../_lib/http.js'
import { deleteMedia } from '../_lib/media.js'
import { createServiceClient } from '../_lib/supabase.js'

interface ModerateBody {
  action:
    | 'list_posts'
    | 'set_approval'
    | 'set_projector_hidden'
    | 'delete_post'
    | 'clear_all'
    | 'list_terms'
    | 'add_term'
    | 'remove_term'
  postId: string
  isApproved: boolean
  isHidden: boolean
  term: string
}

const PAGE_SIZE = 1000
const CLEAR_BATCH_SIZE = 100
const TERM_MAX_LENGTH = 40
const MAX_TERMS = 200

/** Same as `normalizeText` in `src/utils/banned-terms.ts`. */
const normalizeTerm = (value: unknown): string =>
  typeof value === 'string'
    ? value
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
    : ''

export async function POST(req: Request): Promise<Response> {
  const user = await requireIdentity(req)
  if (user instanceof Response) return user

  const body = await readJson<ModerateBody>(req)
  if (!body) return fail(400, 'Corpo da requisição inválido.')
  const { action, postId, isApproved, isHidden } = body

  if ((action === 'delete_post' || action === 'clear_all') && user.role !== 'admin') {
    return fail(403, 'Acesso negado. Apenas administradores podem excluir fotos ou zerar o feed.')
  }
  if (
    (action === 'delete_post' || action === 'set_approval' || action === 'set_projector_hidden') &&
    (typeof postId !== 'string' || !postId)
  ) {
    return fail(400, 'postId é obrigatório')
  }

  // A toggle would show again a post hidden by two people at once
  if (action === 'set_approval' && typeof isApproved !== 'boolean') {
    return fail(400, 'isApproved é obrigatório')
  }
  if (action === 'set_projector_hidden' && typeof isHidden !== 'boolean') {
    return fail(400, 'isHidden é obrigatório')
  }

  const term = normalizeTerm(body.term)
  if ((action === 'add_term' || action === 'remove_term') && !term) {
    return fail(400, 'Termo é obrigatório.')
  }
  if (action === 'add_term' && term.length > TERM_MAX_LENGTH) {
    return fail(400, `O termo pode ter até ${TERM_MAX_LENGTH} caracteres.`)
  }

  try {
    const posts = () => createServiceClient().from('posts')
    const terms = () => createServiceClient().from('banned_terms')

    switch (action) {
      case 'list_posts': {
        // The database returns at most 1000 rows at a time
        const rows = new Map<string, unknown>()
        for (let from = 0; ; from += PAGE_SIZE) {
          const { data, error } = await posts()
            .select('*, challenges(id, title, description, icon, is_active, created_at)')
            .order('created_at', { ascending: false })
            .order('id')
            .range(from, from + PAGE_SIZE - 1)
          if (error) throw error
          for (const row of data) rows.set(row.id as string, row)
          if (data.length < PAGE_SIZE) return json({ posts: [...rows.values()] })
        }
      }
      case 'set_approval': {
        const { data: updated, error } = await posts()
          .update({ is_approved: isApproved })
          .eq('id', postId!)
          .select('id')
        if (error) throw error
        if (updated.length === 0) return fail(404, 'Publicação não encontrada')
        return json({ success: true, isApproved })
      }
      case 'set_projector_hidden': {
        const { data: updated, error } = await posts()
          .update({ hidden_from_projector: isHidden })
          .eq('id', postId!)
          .select('id')
        if (error) throw error
        if (updated.length === 0) return fail(404, 'Publicação não encontrada')
        return json({ success: true, isHidden })
      }
      case 'list_terms': {
        const { data, error } = await terms().select('term').order('term')
        if (error) throw error
        return json({ terms: data.map((row) => row.term as string) })
      }
      case 'add_term': {
        const { data: existing, error: readError } = await terms().select('term')
        if (readError) throw readError
        if (existing.length >= MAX_TERMS && !existing.some((row) => row.term === term)) {
          return fail(400, `A lista aceita até ${MAX_TERMS} termos.`)
        }
        const { error } = await terms().upsert({ term }, { onConflict: 'term' })
        if (error) throw error
        return json({ term })
      }
      case 'remove_term': {
        const { error } = await terms().delete().eq('term', term)
        if (error) throw error
        return json({ success: true })
      }
      case 'delete_post': {
        const { data, error } = await posts().delete().eq('id', postId!).select('media_url')
        if (error) throw error
        await deleteMedia(data.map((post) => post.media_url as string))
        return json({ success: true })
      }
      case 'clear_all': {
        // In batches with their media, so a timeout leaves the rest for later
        for (;;) {
          const { data: batch, error: readError } = await posts()
            .select('id')
            .order('id')
            .limit(CLEAR_BATCH_SIZE)
          if (readError) throw readError
          if (batch.length === 0) return json({ success: true })

          const { data, error } = await posts()
            .delete()
            .in(
              'id',
              batch.map(({ id }) => id as string)
            )
            .select('media_url')
          if (error) throw error
          await deleteMedia(data.map((post) => post.media_url as string))
          if (batch.length < CLEAR_BATCH_SIZE) return json({ success: true })
        }
      }
      default:
        return fail(400, 'Ação desconhecida')
    }
  } catch (err) {
    console.error('[moderate]', err)
    return fail(500, 'Erro interno ao moderar publicações.')
  }
}
