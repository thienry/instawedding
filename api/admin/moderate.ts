import { createClient } from '@supabase/supabase-js'

import { getAdminTokenFromRequest, verifyAdminToken } from '@/api/_lib/security'

interface ModerateRequestBody {
  action: 'toggle_approval' | 'delete_post' | 'clear_all'
  postId?: string
}

export async function POST(req: Request): Promise<Response> {
  // 1. Authorize admin session token
  const token = getAdminTokenFromRequest(req)
  if (!token || !verifyAdminToken(token)) {
    return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Parse request payload
  let body: ModerateRequestBody
  try {
    body = (await req.json()) as ModerateRequestBody
  } catch {
    return new Response(
      JSON.stringify({ error: 'Corpo da requisição inválido.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // 3. Initialize Supabase Admin client with SERVICE_ROLE_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({
        error: 'Supabase Service Role não configurado no servidor.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  try {
    if (body.action === 'toggle_approval') {
      if (!body.postId) {
        return new Response(JSON.stringify({ error: 'postId é obrigatório' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Read current status
      const { data: post, error: readError } = await supabaseAdmin
        .from('posts')
        .select('is_approved')
        .eq('id', body.postId)
        .single()

      if (readError || !post) {
        return new Response(
          JSON.stringify({ error: 'Publicação não encontrada' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      const updatedStatus = !post.is_approved
      const { error: updateError } = await supabaseAdmin
        .from('posts')
        .update({ is_approved: updatedStatus })
        .eq('id', body.postId)

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(
        JSON.stringify({ success: true, isApproved: updatedStatus }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (body.action === 'delete_post') {
      if (!body.postId) {
        return new Response(JSON.stringify({ error: 'postId é obrigatório' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const { error: deleteError } = await supabaseAdmin
        .from('posts')
        .delete()
        .eq('id', body.postId)

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'clear_all') {
      const { error: clearError } = await supabaseAdmin
        .from('posts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (clearError) {
        return new Response(JSON.stringify({ error: clearError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Ação desconhecida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server Error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
