import { PostFooter } from '@/features/feed/components/PostFooter'
import { PostHeader } from '@/features/feed/components/PostHeader'
import { PostMedia } from '@/features/feed/components/PostMedia'

import type { FeedViewMode } from '@/features/feed/types'
import type { Post } from '@/types/domain'

interface PostCardProps {
  readonly post: Post
  readonly viewMode: FeedViewMode
  /** Loads the image eagerly. */
  readonly isPriority: boolean
  readonly isNew: boolean
  readonly isLiked: boolean
  readonly isSignedIn: boolean
  readonly showHeartBurst: boolean
  readonly onTapMedia: () => void
  readonly onOpenMedia: () => void
  readonly onToggleLike: () => void
  readonly onShare: () => void
  readonly onDownload: () => void
  /** Filters the feed by the post's challenge. */
  readonly onSelectChallenge: () => void
  /** Deletes the post. Omit to hide the button. */
  readonly onDelete?: () => void
}

/** Post of the feed. */
export function PostCard({
  post,
  viewMode,
  isPriority,
  isNew,
  isLiked,
  isSignedIn,
  showHeartBurst,
  onTapMedia,
  onOpenMedia,
  onToggleLike,
  onShare,
  onDownload,
  onSelectChallenge,
  onDelete,
}: PostCardProps) {
  return (
    <article
      className={`bg-white rounded-3xl overflow-hidden border shadow-xs hover:shadow-md transition-all flex flex-col justify-between [content-visibility:auto] [contain-intrinsic-size:550px] ${
        isNew
          ? 'border-gold-400/70 ring-1 ring-gold-400/25'
          : 'border-sage-200/80'
      }`}
    >
      <div>
        <PostHeader
          post={post}
          isNew={isNew}
          onSelectChallenge={onSelectChallenge}
          onDelete={onDelete}
        />
        <PostMedia
          post={post}
          viewMode={viewMode}
          isPriority={isPriority}
          showHeartBurst={showHeartBurst}
          onTap={onTapMedia}
          onOpen={onOpenMedia}
        />
      </div>
      <PostFooter
        post={post}
        isLiked={isLiked}
        isSignedIn={isSignedIn}
        onToggleLike={onToggleLike}
        onShare={onShare}
        onDownload={onDownload}
      />
    </article>
  )
}
