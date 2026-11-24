import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SupabasePostRepository } from '@/services/supabase/supabase-post.repository'

vi.mock('@/utils/session', () => ({
  getGuestSession: () => ({ sessionId: 'session-1' }),
}))

const ID = '11111111-1111-1111-1111-111111111111'
const repo = new SupabasePostRepository()

type Rows = Record<string, unknown>[]

// Fakes PostgREST: each HTTP method answers with rows, or fails if 'error'.
function database(answers: Record<string, Rows | 'error'>) {
  const methods: string[] = []
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const method = init.method ?? 'GET'
    methods.push(method)
    const answer = answers[method] ?? []
    if (answer === 'error') {
      return Response.json(
        { message: 'denied', code: '42501' },
        { status: 403 }
      )
    }
    const single = new Headers(init.headers)
      .get('accept')
      ?.includes('vnd.pgrst.object')
    if (single && answer.length !== 1) {
      return Response.json(
        { message: 'no single row', code: 'PGRST116' },
        { status: 406 }
      )
    }
    return Response.json(single ? answer[0] : answer)
  })
  return methods
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('deletePost', () => {
  it('resolves when the row is deleted', async () => {
    const methods = database({ DELETE: [{ id: ID }] })
    await repo.deletePost(ID)
    expect(methods).toEqual(['DELETE'])
  })

  it('rejects on a database error', async () => {
    database({ DELETE: 'error' })
    await expect(repo.deletePost(ID)).rejects.toThrow('denied')
  })

  it('rejects when RLS silently blocks it', async () => {
    database({ DELETE: [], GET: [{ id: ID }] })
    await expect(repo.deletePost(ID)).rejects.toThrow('not deleted')
  })

  it('resolves when the post is already gone', async () => {
    database({ DELETE: [], GET: [] })
    await repo.deletePost(ID)
  })

  it('rejects when it cannot confirm the post is gone', async () => {
    database({ DELETE: [], GET: 'error' })
    await expect(repo.deletePost(ID)).rejects.toThrow('denied')
  })
})

describe('admin actions', () => {
  it('go through the server and surface its error', async () => {
    const calls: [string, unknown][] = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push([url, JSON.parse(init.body as string)])
      return Response.json({ error: 'Não autorizado.' }, { status: 401 })
    })
    for (const run of [
      () => repo.getAllPostsForModeration(),
      () => repo.togglePostApproval(ID),
      () => repo.deletePostAsAdmin(ID),
      () => repo.clearAllPosts(),
    ]) {
      await expect(run()).rejects.toThrow('Não autorizado.')
    }
    expect(calls).toEqual([
      ['/api/admin/moderate', { action: 'list_posts' }],
      ['/api/admin/moderate', { action: 'toggle_approval', postId: ID }],
      ['/api/admin/moderate', { action: 'delete_post', postId: ID }],
      ['/api/admin/moderate', { action: 'clear_all' }],
    ])
  })
})

describe('createPost', () => {
  it('does not retry without the projector choice on an error', async () => {
    const methods = database({ POST: 'error' })
    await expect(
      repo.createPost({
        authorName: 'Ana',
        mediaUrl: '/media/a.webp',
        showOnProjector: false,
      })
    ).rejects.toThrow('denied')
    expect(methods).toEqual(['POST'])
  })
})
