import { adminRequest, deleteOwnPost, getAuthHeaders } from '@/services/api/api.client'
import { getSupabaseClient } from '@/services/supabase/supabase.client'
import { isVideoUrl } from '@/utils/video'

import type { PostRepository } from '@/services/contracts/post-repository.contract'
import type { CreatePostDTO, Post, PostMediaType, ToggleLikeResult } from '@/types/domain'

interface SupabasePostRow {
  id: string
  author_name: string
  author_avatar_url?: string | null
  media_url: string
  media_type?: PostMediaType | null
  caption: string | null
  challenge_id: number | null
  client_session_id?: string
  likes_count: number
  is_approved: boolean
  show_on_projector?: boolean | null
  hidden_from_projector?: boolean | null
  created_at: string
  challenges?: {
    id: number
    title: string
    description: string
    icon: string
    is_active: boolean
    created_at: string
  } | null
}

const POST_SELECT_QUERY = '*, challenges(id, title, description, icon, is_active, created_at)'

/** The server returns at most 1000 rows; a lower cap also works. */
const PAGE_SIZE = 1000

const UNIQUE_VIOLATION = '23505'

export class SupabasePostRepository implements PostRepository {
  async getPosts(): Promise<Post[]> {
    // By id, since a new post meanwhile repeats the last one of the page before
    const rows = new Map<string, SupabasePostRow>()
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await getSupabaseClient()
        .from('posts')
        .select(POST_SELECT_QUERY)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, from + PAGE_SIZE - 1)

      if (error) {
        throw new Error(`Failed to fetch posts from Supabase: ${error.message}`)
      }

      const page = data as unknown as SupabasePostRow[]
      for (const row of page) rows.set(row.id, row)
      if (page.length < PAGE_SIZE) return [...rows.values()].map(this.mapRowToPost)
    }
  }

  getVisiblePostIds(): Promise<ReadonlySet<string>> {
    return this.getApprovedPostIds(false)
  }

  getProjectorPostIds(): Promise<ReadonlySet<string>> {
    return this.getApprovedPostIds(true)
  }

  private async getApprovedPostIds(isForProjector: boolean): Promise<ReadonlySet<string>> {
    const ids = new Set<string>()
    let lastId: string | null = null
    for (;;) {
      // Paged by id: with offsets, a deletion meanwhile would skip a post
      let query = getSupabaseClient()
        .from('posts')
        .select('id')
        .eq('is_approved', true)
        .order('id')
        .limit(PAGE_SIZE)
      if (isForProjector) query = query.not('hidden_from_projector', 'is', true)
      if (lastId) query = query.gt('id', lastId)
      const { data, error } = await query
      if (error) throw new Error(`Failed to fetch post ids: ${error.message}`)

      const page = data as { id: string }[]
      for (const { id } of page) ids.add(id)
      lastId = page.at(-1)?.id ?? null
      if (!lastId) return ids
    }
  }

  async createPost(dto: CreatePostDTO): Promise<Post> {
    const supabase = getSupabaseClient()
    // Without a renewed session the insert would go as anonymous and be refused
    await getAuthHeaders()
    const showOnProjector = dto.showOnProjector ?? true
    const basePayload = {
      ...(dto.id && { id: dto.id }),
      author_name: dto.authorName.trim(),
      media_url: dto.mediaUrl,
      caption: dto.caption?.trim() || null,
      challenge_id: dto.challengeId ?? null,
      client_session_id: dto.clientSessionId || 'anonymous',
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        ...basePayload,
        author_avatar_url: dto.authorAvatarUrl ?? null,
        show_on_projector: showOnProjector,
      })
      .select(POST_SELECT_QUERY)
      .single()

    if (error?.code === UNIQUE_VIOLATION && dto.id) {
      const existing = await this.findOwnPost(dto.id, dto.clientSessionId)
      if (existing) return existing
    }

    if (error) {
      throw new Error(`Failed to create post in Supabase: ${error.message}`, { cause: error })
    }

    return this.mapRowToPost(data as unknown as SupabasePostRow)
  }

  async toggleLike(postId: string, sessionId: string): Promise<ToggleLikeResult> {
    const supabase = getSupabaseClient()
    const { data: existingLike, error: readError } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('client_session_id', sessionId)
      .maybeSingle()
    if (readError) throw new Error(`Failed to read like: ${readError.message}`)

    const isLiked = !existingLike
    const { error } = existingLike
      ? await supabase.from('likes').delete().eq('id', existingLike.id)
      : await supabase.from('likes').insert({ post_id: postId, client_session_id: sessionId })
    // Already liked in another tab: the result is the one wanted
    if (error && error.code !== UNIQUE_VIOLATION) {
      throw new Error(`Failed to change like: ${error.message}`)
    }

    const { data: post, error: countError } = await supabase.rpc(
      isLiked ? 'increment_likes' : 'decrement_likes',
      { target_post_id: postId }
    )
    // The like itself was saved, so only the total is unknown
    return { isLiked, likesCount: countError ? null : (post?.likes_count ?? null) }
  }

  async hasUserLiked(postId: string, sessionId: string): Promise<boolean> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('client_session_id', sessionId)
      .maybeSingle()

    if (error || !data) return false
    return true
  }

  async getLikedPostIds(sessionId: string): Promise<Set<string>> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('likes')
      .select('post_id')
      .eq('client_session_id', sessionId)

    if (error || !data) return new Set()
    const rows = data as Array<{ post_id: string }>
    return new Set(rows.map((r) => r.post_id))
  }

  async getAllPostsForModeration(): Promise<Post[]> {
    const { posts } = await adminRequest<{ posts: SupabasePostRow[] }>('moderate', {
      action: 'list_posts',
    })
    return posts.map(this.mapRowToPost)
  }

  async setPostApproval(postId: string, isApproved: boolean): Promise<void> {
    await adminRequest('moderate', { action: 'set_approval', postId, isApproved })
  }

  async setPostProjectorHidden(postId: string, isHidden: boolean | null): Promise<void> {
    await adminRequest('moderate', { action: 'set_projector_hidden', postId, isHidden })
  }

  async deletePost(postId: string): Promise<void> {
    // Through the server, which also deletes the media
    await deleteOwnPost(postId)
  }

  async deletePostAsAdmin(postId: string): Promise<void> {
    await adminRequest('moderate', { action: 'delete_post', postId })
  }

  async clearAllPosts(): Promise<void> {
    await adminRequest('moderate', { action: 'clear_all' })
  }

  /** Finds a post of the guest, even if it was hidden by a moderator. */
  private async findOwnPost(postId: string, clientSessionId = 'anonymous'): Promise<Post | null> {
    const { data, error } = await getSupabaseClient()
      .from('posts')
      .select(POST_SELECT_QUERY)
      .eq('id', postId)
      .eq('client_session_id', clientSessionId)
      .maybeSingle()

    if (error || !data) return null
    return this.mapRowToPost(data as unknown as SupabasePostRow)
  }

  private mapRowToPost(row: SupabasePostRow): Post {
    const mediaType: PostMediaType =
      row.media_type === 'video' || isVideoUrl(row.media_url) ? 'video' : 'image'

    return {
      id: row.id,
      authorName: row.author_name,
      authorAvatarUrl: row.author_avatar_url ?? null,
      mediaUrl: row.media_url,
      mediaType,
      caption: row.caption,
      challengeId: row.challenge_id,
      clientSessionId: row.client_session_id,
      likesCount: row.likes_count,
      isApproved: row.is_approved,
      showOnProjector: row.show_on_projector !== false,
      hiddenFromProjector: row.hidden_from_projector ?? null,
      createdAt: row.created_at,
      challenge: row.challenges
        ? {
            id: row.challenges.id,
            title: row.challenges.title,
            description: row.challenges.description,
            icon: row.challenges.icon,
            isActive: row.challenges.is_active,
            createdAt: row.challenges.created_at,
          }
        : undefined,
    }
  }
}
