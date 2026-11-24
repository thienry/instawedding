import { authorize } from '../_lib/auth.js'
import { fail, json, readJson } from '../_lib/http.js'
import { createServiceClient } from '../_lib/supabase.js'

interface CeremonialistBody {
  action: 'list' | 'add' | 'remove'
  id: string
  email: string
  name: string
}

const COLUMNS = 'id, email, name, created_at, created_by'
const UNIQUE_VIOLATION = '23505'

export async function POST(req: Request): Promise<Response> {
  const user = await authorize(req)
  if (!user) return fail(401, 'Não autorizado.')
  if (user.role !== 'admin') {
    return fail(403, 'Apenas o administrador pode gerenciar acessos.')
  }

  const body = await readJson<CeremonialistBody>(req)
  if (!body) return fail(400, 'Corpo da requisição inválido.')

  try {
    const ceremonialists = () => createServiceClient().from('ceremonialists')

    switch (body.action) {
      case 'list': {
        const { data, error } = await ceremonialists()
          .select(COLUMNS)
          .order('created_at', { ascending: false })
        if (error) throw error
        return json({ ceremonialists: data })
      }
      case 'add': {
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
        if (!/^[^\s@]+@[^\s@]+$/.test(email) || email.length > 254) {
          return fail(400, 'Por favor, informe um endereço de e-mail válido.')
        }
        const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
        const { data, error } = await ceremonialists()
          .insert({ email, name: name || null, created_by: user.email })
          .select(COLUMNS)
          .single()
        if (error?.code === UNIQUE_VIOLATION) {
          return fail(409, `O e-mail "${email}" já está cadastrado.`)
        }
        if (error) throw error
        return json({ ceremonialist: data })
      }
      case 'remove': {
        if (typeof body.id !== 'string' || !body.id) {
          return fail(400, 'id é obrigatório')
        }
        const { error } = await ceremonialists().delete().eq('id', body.id)
        if (error) throw error
        return json({ success: true })
      }
      default:
        return fail(400, 'Ação desconhecida')
    }
  } catch (err) {
    console.error('[ceremonialists]', err)
    return fail(500, 'Erro interno ao gerenciar acessos.')
  }
}
