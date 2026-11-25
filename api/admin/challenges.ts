import { requireIdentity } from '../_lib/auth.js'
import { fail, json, readJson } from '../_lib/http.js'
import { createServiceClient } from '../_lib/supabase.js'

interface ChallengeBody {
  action: 'create' | 'set_active' | 'delete'
  id: number
  isActive: boolean
  title: string
  description: string
  icon: string
}

const text = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

export async function POST(req: Request): Promise<Response> {
  const user = await requireIdentity(req)
  if (user instanceof Response) return user

  const body = await readJson<ChallengeBody>(req)
  if (!body) return fail(400, 'Corpo da requisição inválido.')
  const { action, id, isActive } = body

  if (action === 'delete' && user.role !== 'admin') {
    return fail(403, 'Apenas administradores podem excluir desafios.')
  }
  if ((action === 'set_active' || action === 'delete') && !Number.isInteger(id)) {
    return fail(400, 'id é obrigatório')
  }

  if (action === 'set_active' && typeof isActive !== 'boolean') {
    return fail(400, 'isActive é obrigatório')
  }

  try {
    const challenges = () => createServiceClient().from('challenges')

    switch (action) {
      case 'create': {
        const title = text(body.title, 100)
        const description = text(body.description, 500)
        if (!title || !description) {
          return fail(400, 'Título e descrição são obrigatórios.')
        }
        const { data, error } = await challenges()
          .insert({
            title,
            description,
            icon: text(body.icon, 16) || '✨',
            is_active: true,
          })
          .select('id, title, description, icon, is_active, created_at')
          .single()
        if (error) throw error
        return json({ challenge: data })
      }
      case 'set_active': {
        const { data, error } = await challenges()
          .update({ is_active: isActive })
          .eq('id', id!)
          .select('id')
        if (error) throw error
        if (data.length === 0) return fail(404, 'Desafio não encontrado.')
        return json({ success: true })
      }
      case 'delete': {
        const { error } = await challenges().delete().eq('id', id!)
        if (error) throw error
        return json({ success: true })
      }
      default:
        return fail(400, 'Ação desconhecida')
    }
  } catch (err) {
    console.error('[challenges]', err)
    return fail(500, 'Erro interno ao alterar desafios.')
  }
}
