import { adminRequest } from '@/services/api/api.client'
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

const UNIQUE_VIOLATION = '23505'

export class SupabasePostRepository implements PostRepository {
  async getPosts(): Promise<Post[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT_QUERY)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch posts from Supabase: ${error.message}`)
    }

    return (data as unknown as SupabasePostRow[]).map(this.mapRowToPost)
  }

  async createPost(dto: CreatePostDTO): Promise<Post> {
    const supabase = getSupabaseClient()
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

    // Older schemas may lack a column; any other error must not drop fields
    if (error && error.code !== 'PGRST204') {
      throw new Error(`Failed to create post in Supabase: ${error.message}`)
    }

    if (error) {
      const fallbackWithAvatar = await supabase
        .from('posts')
        .insert({
          ...basePayload,
          author_avatar_url: dto.authorAvatarUrl ?? null,
        })
        .select(POST_SELECT_QUERY)
        .single()

      if (!fallbackWithAvatar.error && fallbackWithAvatar.data) {
        return this.mapRowToPost(fallbackWithAvatar.data as unknown as SupabasePostRow)
      }

      const fallbackResult = await supabase
        .from('posts')
        .insert(basePayload)
        .select(POST_SELECT_QUERY)
        .single()

      if (fallbackResult.error || !fallbackResult.data) {
        throw new Error(
          `Failed to create post in Supabase: ${fallbackResult.error?.message ?? error.message}`
        )
      }

      return this.mapRowToPost(fallbackResult.data as unknown as SupabasePostRow)
    }

    return this.mapRowToPost(data as unknown as SupabasePostRow)
  }

  async toggleLike(postId: string, sessionId: string): Promise<ToggleLikeResult> {
    const supabase = getSupabaseClient()

    // Check existing like
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('client_session_id', sessionId)
      .maybeSingle()

    if (existingLike) {
      // Remove like
      await supabase.from('likes').delete().eq('id', existingLike.id)
      const { data: post } = await supabase.rpc('decrement_likes', {
        target_post_id: postId,
      })
      return {
        isLiked: false,
        likesCount: post?.likes_count ?? 0,
      }
    } else {
      // Add like
      await supabase.from('likes').insert({ post_id: postId, client_session_id: sessionId })
      const { data: post } = await supabase.rpc('increment_likes', {
        target_post_id: postId,
      })
      return {
        isLiked: true,
        likesCount: post?.likes_count ?? 1,
      }
    }
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

  async togglePostApproval(postId: string): Promise<boolean> {
    const { isApproved } = await adminRequest<{ isApproved: boolean }>('moderate', {
      action: 'toggle_approval',
      postId,
    })
    return isApproved
  }

  async deletePost(postId: string): Promise<void> {
    const supabase = getSupabaseClient()
    // RLS blocks deletes silently, so check the affected rows
    const { data: deleted, error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .select('id')

    if (error) {
      throw new Error(`Failed to delete post in Supabase: ${error.message}`)
    }
    if (deleted.length > 0) return

    const { data: remaining, error: readError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)

    if (readError) {
      throw new Error(`Failed to confirm deletion: ${readError.message}`)
    }
    if (remaining.length > 0) throw new Error('Post was not deleted')
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
