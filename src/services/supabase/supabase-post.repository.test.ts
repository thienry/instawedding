import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SupabasePostRepository } from '@/services/supabase/supabase-post.repository'

vi.mock('@/utils/session', () => ({
  getGuestSession: () => ({ sessionId: 'session-1' }),
}))

const ID = '11111111-1111-1111-1111-111111111111'
const repo = new SupabasePostRepository()

type Rows = Record<string, unknown>[]

// Fakes PostgREST: each HTTP method answers with rows, or fails if 'error'.
function database(answers: Record<string, Rows | 'error' | 'duplicate'>) {
  const methods: string[] = []
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const method = init.method ?? 'GET'
    methods.push(method)
    const answer = answers[method] ?? []
    if (answer === 'error') {
      return Response.json({ message: 'denied', code: '42501' }, { status: 403 })
    }
    if (answer === 'duplicate') {
      return Response.json({ message: 'duplicate key', code: '23505' }, { status: 409 })
    }
    const single = new Headers(init.headers).get('accept')?.includes('vnd.pgrst.object')
    if (single && answer.length !== 1) {
      return Response.json({ message: 'no single row', code: 'PGRST116' }, { status: 406 })
    }
    return Response.json(single ? answer[0] : answer)
  })
  return methods
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('deletePost', () => {
  it('goes through the server and surfaces its error', async () => {
    const fetch = vi.fn(async () => Response.json({ success: true }))
    vi.stubGlobal('fetch', fetch)
    await repo.deletePost(ID)
    expect(fetch).toHaveBeenCalledWith(
      '/api/delete-post',
      expect.objectContaining({ body: JSON.stringify({ postId: ID }) })
    )
    vi.stubGlobal('fetch', async () => Response.json({ error: 'Negado' }, { status: 403 }))
    await expect(repo.deletePost(ID)).rejects.toThrow('Negado')
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

  const dto = {
    id: ID,
    authorName: 'Ana',
    mediaUrl: '/media/a.webp',
    clientSessionId: 'g1',
  }
  const row = {
    id: ID,
    author_name: 'Ana',
    media_url: '/media/first.webp',
    client_session_id: 'g1',
  }

  it('sends the id', async () => {
    let body: unknown
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      body = JSON.parse(init.body as string)
      return Response.json(row)
    })
    await repo.createPost(dto)
    expect(body).toMatchObject({ id: ID })
  })

  it('returns the post a previous attempt already created', async () => {
    const methods = database({ POST: 'duplicate', GET: [row] })
    const post = await repo.createPost(dto)
    expect(post).toMatchObject({ id: ID, mediaUrl: '/media/first.webp' })
    expect(methods).toEqual(['POST', 'GET'])
  })

  it('rejects an id taken by a post it cannot find', async () => {
    database({ POST: 'duplicate', GET: [] })
    await expect(repo.createPost(dto)).rejects.toThrow('duplicate key')
  })

  it('looks only for posts of the same guest', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      if (init.method === 'POST') {
        return Response.json({ message: 'x', code: '23505' }, { status: 409 })
      }
      urls.push(decodeURIComponent(url))
      return Response.json([row])
    })
    await repo.createPost(dto)
    expect(urls[0]).toContain(`id=eq.${ID}`)
    expect(urls[0]).toContain('client_session_id=eq.g1')
  })
})

describe('toggleLike', () => {
  it('rejects when the like is not saved', async () => {
    database({ GET: [], POST: 'error' })
    await expect(repo.toggleLike(ID, 'g1')).rejects.toThrow('denied')
  })

  it('does not invent a total when the count fails', async () => {
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      if (url.includes('/rpc/')) return Response.json({ message: 'x' }, { status: 500 })
      return Response.json(init.method === 'GET' ? [] : null)
    })
    expect(await repo.toggleLike(ID, 'g1')).toEqual({ isLiked: true, likesCount: null })
  })
})

describe('getVisiblePostIds', () => {
  it('reads every page', async () => {
    const pages = [[{ id: 'a' }, { id: 'b' }], [{ id: 'c' }], []]
    const urls: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url)
      return Response.json(pages[urls.length - 1])
    })
    expect([...(await repo.getVisiblePostIds())]).toEqual(['a', 'b', 'c'])
    expect(urls[1]).toContain('id=gt.b')
  })
})
