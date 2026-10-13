import type { PostSubscriptionCallback, RealtimeService, UnsubscribeFunction } from '../contracts/realtime.contract';
import type { Post } from '../../types/domain';
import { getSupabaseClient } from './supabase.client';

export class SupabaseRealtimeService implements RealtimeService {
  subscribeToNewPosts(callback: PostSubscriptionCallback): UnsubscribeFunction {
    const supabase = getSupabaseClient();
    const channelName = `realtime-posts-${crypto.randomUUID()}`;

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
            id: string;
            author_name: string;
            media_url: string;
            caption: string | null;
            challenge_id: number | null;
            likes_count: number;
            is_approved: boolean;
            created_at: string;
          };

          if (!newRow.is_approved) return;

          let challenge = undefined;
          if (newRow.challenge_id) {
            const { data } = await supabase
              .from('challenges')
              .select('*')
              .eq('id', newRow.challenge_id)
              .maybeSingle();
            if (data) {
              challenge = {
                id: data.id,
                title: data.title,
                description: data.description,
                icon: data.icon,
                isActive: data.is_active,
                createdAt: data.created_at,
              };
            }
          }

          const post: Post = {
            id: newRow.id,
            authorName: newRow.author_name,
            mediaUrl: newRow.media_url,
            caption: newRow.caption,
            challengeId: newRow.challenge_id,
            likesCount: newRow.likes_count,
            isApproved: newRow.is_approved,
            createdAt: newRow.created_at,
            challenge,
          };

          callback(post);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  broadcastNewPost(_post: Post): void {
    // In Supabase, the insert into the database triggers the Realtime postgres_changes event automatically.
  }
}
