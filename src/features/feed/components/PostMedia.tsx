import { Heart, Maximize2 } from 'lucide-react'

import { FeedVideoPlayer } from '@/components/common/FeedVideoPlayer'
import { ProgressiveImage } from '@/components/common/ProgressiveImage'
import { resolvePostMediaType } from '@/utils/video'

import type { FeedViewMode } from '@/features/feed/types'
import type { Post } from '@/types/domain'

interface PostMediaProps {
  readonly post: Post
  readonly viewMode: FeedViewMode
  /** Loads the image eagerly. */
  readonly isPriority: boolean
  readonly showHeartBurst: boolean
  readonly onTap: () => void
  /** Opens the media in full screen. */
  readonly onOpen: () => void
}

/** Photo or video of a post. A double tap likes it. */
export function PostMedia({
  post,
  viewMode,
  isPriority,
  showHeartBurst,
  onTap,
  onOpen,
}: PostMediaProps) {
  const isGrid = viewMode === 'grid'
  const isVideo = resolvePostMediaType(post) === 'video'

  return (
    <div
      onClick={onTap}
      className="relative bg-slate-950/95 flex items-center justify-center overflow-hidden select-none cursor-pointer group"
    >
      {isVideo ? (
        <FeedVideoPlayer
          src={post.mediaUrl}
          cacheKey={post.id}
          containerClassName={
            isGrid ? 'w-full aspect-4/3' : 'w-full min-h-[260px]'
          }
          className={
            isGrid
              ? 'w-full aspect-4/3 object-contain'
              : 'w-full max-h-[75vh] object-contain'
          }
        />
      ) : (
        <ProgressiveImage
          src={post.mediaUrl}
          alt={post.caption || `Foto por ${post.authorName}`}
          cacheKey={post.id}
          priority={isPriority}
          containerClassName={
            isGrid ? 'w-full aspect-4/3' : 'w-full min-h-[260px]'
          }
          className={
            isGrid
              ? 'w-full aspect-4/3 object-contain'
              : 'w-full max-h-[75vh] object-contain'
          }
        />
      )}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onOpen()
        }}
        aria-label="Ver em tela cheia"
        className="absolute top-3 right-3 p-2.5 rounded-full bg-black/55 hover:bg-black/80 text-white/95 backdrop-blur-xs transition-opacity opacity-85 group-hover:opacity-100 shadow-sm z-10"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {showHeartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10 animate-in zoom-in-50 fade-in duration-150 z-10">
          <Heart className="w-24 h-24 fill-rose-500 text-rose-500 drop-shadow-[0_4px_20px_rgba(244,63,94,0.65)] animate-bounce" />
        </div>
      )}
    </div>
  )
}
