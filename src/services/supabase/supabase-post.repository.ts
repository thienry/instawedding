import { getSupabaseClient } from '@/services/supabase/supabase.client'

import type { PostRepository } from '@/services/contracts/post-repository.contract'
import type { CreatePostDTO, Post, ToggleLikeResult } from '@/types/domain'

interface SupabasePostRow {
  id: string
  author_name: string
  media_url: string
  caption: string | null
  challenge_id: number | null
  client_session_id?: string
  likes_count: number
  is_approved: boolean
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

export class SupabasePostRepository implements PostRepository {
  async getPosts(): Promise<Post[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, author_name, media_url, caption, challenge_id, client_session_id, likes_count, is_approved, created_at, challenges(id, title, description, icon, is_active, created_at)'
      )
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch posts from Supabase: ${error.message}`)
    }

    return (data as unknown as SupabasePostRow[]).map(this.mapRowToPost)
  }

  async createPost(dto: CreatePostDTO): Promise<Post> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_name: dto.authorName.trim(),
        media_url: dto.mediaUrl,
        caption: dto.caption?.trim() || null,
        challenge_id: dto.challengeId ?? null,
        client_session_id: dto.clientSessionId || 'anonymous',
      })
      .select(
        'id, author_name, media_url, caption, challenge_id, client_session_id, likes_count, is_approved, created_at, challenges(id, title, description, icon, is_active, created_at)'
      )
      .single()

    if (error || !data) {
      throw new Error(
        `Failed to create post in Supabase: ${error?.message ?? 'Unknown error'}`
      )
    }

    return this.mapRowToPost(data as unknown as SupabasePostRow)
  }

  async toggleLike(
    postId: string,
    sessionId: string
  ): Promise<ToggleLikeResult> {
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
      await supabase
        .from('likes')
        .insert({ post_id: postId, client_session_id: sessionId })
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
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, author_name, media_url, caption, challenge_id, client_session_id, likes_count, is_approved, created_at, challenges(id, title, description, icon, is_active, created_at)'
      )
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch moderation posts: ${error.message}`)
    }

    return (data as unknown as SupabasePostRow[]).map(this.mapRowToPost)
  }

  async togglePostApproval(postId: string): Promise<boolean> {
    const supabase = getSupabaseClient()
    const { data: post } = await supabase
      .from('posts')
      .select('is_approved')
      .eq('id', postId)
      .single()

    if (!post) throw new Error('Post not found')
    const newStatus = !post.is_approved

    await supabase
      .from('posts')
      .update({ is_approved: newStatus })
      .eq('id', postId)

    return newStatus
  }

  async deletePost(postId: string): Promise<void> {
    const supabase = getSupabaseClient()
    await supabase.from('posts').delete().eq('id', postId)
  }

  async clearAllPosts(): Promise<void> {
    const supabase = getSupabaseClient()
    await supabase
      .from('posts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
  }

  private mapRowToPost(row: SupabasePostRow): Post {
    return {
      id: row.id,
      authorName: row.author_name,
      mediaUrl: row.media_url,
      caption: row.caption,
      challengeId: row.challenge_id,
      clientSessionId: row.client_session_id,
      likesCount: row.likes_count,
      isApproved: row.is_approved,
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
