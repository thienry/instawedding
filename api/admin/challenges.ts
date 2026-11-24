import { authorize } from '../_lib/auth.js'
import { fail, json, readJson } from '../_lib/http.js'
import { createServiceClient } from '../_lib/supabase.js'

interface ChallengeBody {
  action: 'create' | 'toggle' | 'delete'
  id: number
  title: string
  description: string
  icon: string
}

const text = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

export async function POST(req: Request): Promise<Response> {
  const user = await authorize(req)
  if (!user) return fail(401, 'Não autorizado.')

  const body = await readJson<ChallengeBody>(req)
  if (!body) return fail(400, 'Corpo da requisição inválido.')
  const { action, id } = body

  if (action === 'delete' && user.role !== 'admin') {
    return fail(403, 'Apenas administradores podem excluir desafios.')
  }
  if ((action === 'toggle' || action === 'delete') && !Number.isInteger(id)) {
    return fail(400, 'id é obrigatório')
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
      case 'toggle': {
        const { data: current, error: readError } = await challenges()
          .select('is_active')
          .eq('id', id!)
          .maybeSingle()
        if (readError) throw readError
        if (!current) return fail(404, 'Desafio não encontrado.')

        const isActive = !current.is_active
        const { error } = await challenges()
          .update({ is_active: isActive })
          .eq('id', id!)
        if (error) throw error
        return json({ isActive })
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
