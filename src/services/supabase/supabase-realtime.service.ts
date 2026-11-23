import { getSupabaseClient } from '@/services/supabase/supabase.client'
import { generateUUID } from '@/utils/uuid'
import { isVideoUrl } from '@/utils/video'

import type {
  PostSubscriptionCallback,
  RealtimeService,
  UnsubscribeFunction,
} from '@/services/contracts/realtime.contract'
import type { Post, PostMediaType } from '@/types/domain'

export class SupabaseRealtimeService implements RealtimeService {
  subscribeToNewPosts(callback: PostSubscriptionCallback): UnsubscribeFunction {
    const supabase = getSupabaseClient()
    const channelName = `realtime-posts-${generateUUID()}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        async (payload) => {
          const newRow = payload.new as {
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
            created_at: string
          }

          if (!newRow.is_approved) return

          let challenge = undefined
          if (newRow.challenge_id) {
            const { data } = await supabase
              .from('challenges')
              .select('*')
              .eq('id', newRow.challenge_id)
              .maybeSingle()
            if (data) {
              challenge = {
                id: data.id,
                title: data.title,
                description: data.description,
                icon: data.icon,
                isActive: data.is_active,
                createdAt: data.created_at,
              }
            }
          }

          const mediaType: PostMediaType =
            newRow.media_type === 'video' || isVideoUrl(newRow.media_url)
              ? 'video'
              : 'image'

          const post: Post = {
            id: newRow.id,
            authorName: newRow.author_name,
            authorAvatarUrl: newRow.author_avatar_url ?? null,
            mediaUrl: newRow.media_url,
            mediaType,
            caption: newRow.caption,
            challengeId: newRow.challenge_id,
            clientSessionId: newRow.client_session_id,
            likesCount: newRow.likes_count,
            isApproved: newRow.is_approved,
            showOnProjector:
              (newRow as Record<string, unknown>).show_on_projector !== false,
            createdAt: newRow.created_at,
            challenge,
          }

          callback(post)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  broadcastNewPost(_post: Post): void {
    // In Supabase, the insert into the database triggers the Realtime postgres_changes event automatically.
  }
}
