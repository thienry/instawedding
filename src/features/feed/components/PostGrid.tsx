import { Loader2 } from 'lucide-react'

import { PostCard } from '@/features/feed/components/PostCard'
import { useInfiniteScroll } from '@/features/feed/hooks/useInfiniteScroll'
import { isOwnPost } from '@/features/feed/utils/feed-posts'

import type { FeedFilterState } from '@/features/feed/hooks/useFeedFilter'
import type { FeedGuest } from '@/features/feed/hooks/useFeedGuest'
import type { FeedPosts } from '@/features/feed/hooks/useFeedPosts'
import type { Likes } from '@/features/feed/hooks/useLikes'
import type { PostSharing } from '@/features/feed/hooks/usePostSharing'
import type { FeedViewMode } from '@/features/feed/types'
import type { Post } from '@/types/domain'

/** Posts likely to be visible at once, whose images load eagerly. */
const PRIORITY_COUNT = 2

interface PostGridProps {
  readonly filter: FeedFilterState
  readonly feed: FeedPosts
  readonly guest: FeedGuest
  readonly likes: Likes
  readonly sharing: PostSharing
  readonly viewMode: FeedViewMode
  /** New posts still waiting in the notification. */
  readonly unseenPostIds: ReadonlySet<string>
  readonly onOpenPost: (postId: string) => void
  readonly onDeletePost: (post: Post) => void
}

/** Filtered posts, revealed as the guest scrolls. */
export function PostGrid({
  filter,
  feed,
  guest,
  likes,
  sharing,
  viewMode,
  unseenPostIds,
  onOpenPost,
  onDeletePost,
}: PostGridProps) {
  const { tab, challengeId, filteredPosts, selectChallenge } = filter
  const { visibleItems, hasMore, sentinelRef } = useInfiniteScroll(
    filteredPosts,
    `${tab}:${challengeId}`
  )

  return (
    <>
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-6' : 'space-y-6'}>
        {visibleItems.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            viewMode={viewMode}
            isPriority={index < PRIORITY_COUNT}
            isNew={unseenPostIds.has(post.id) || feed.revealedPostIds.has(post.id)}
            isLiked={feed.likedPostIds.has(post.id)}
            isSignedIn={guest.guestUser !== null}
            showHeartBurst={likes.heartBurstPostId === post.id}
            onTapMedia={() => likes.tapMedia(post.id)}
            onOpenMedia={() => onOpenPost(post.id)}
            onToggleLike={() => void likes.toggleLike(post.id)}
            onShare={() => void sharing.sharePost(post)}
            onDownload={() => void sharing.downloadPost(post)}
            onSelectChallenge={() => {
              if (post.challenge) selectChallenge(post.challenge.id)
            }}
            onDelete={isOwnPost(post, guest) ? () => onDeletePost(post) : undefined}
          />
        ))}
      </div>

      {hasMore && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-xs text-sage-800/60 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-sage-800" />
          <span>Carregando mais fotos...</span>
        </div>
      )}
    </>
  )
}
