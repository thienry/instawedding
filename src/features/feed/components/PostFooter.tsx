import { Download, Heart, Share2 } from 'lucide-react'

import type { Post } from '@/types/domain'

interface PostFooterProps {
  readonly post: Post
  readonly isLiked: boolean
  readonly isSignedIn: boolean
  readonly onToggleLike: () => void
  readonly onShare: () => void
  readonly onDownload: () => void
}

/** Like, share and download buttons, and the caption of a post. */
export function PostFooter({
  post,
  isLiked,
  isSignedIn,
  onToggleLike,
  onShare,
  onDownload,
}: PostFooterProps) {
  return (
    <div className="px-4 py-2.5 sm:px-5 sm:py-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleLike}
            title={isSignedIn ? 'Curtir foto' : 'Entre com Google para curtir'}
            className="inline-flex items-center gap-2 min-h-11 px-3 -ml-2 rounded-full text-base font-bold text-sage-900 hover:bg-rose-50/70 active:scale-95 transition-all">
            <Heart
              className={`w-6 h-6 transition-colors ${
                isLiked ? 'fill-rose-500 text-rose-500' : 'text-sage-800/80 stroke-[1.85]'
              }`}
            />
            <span>{post.likesCount}</span>
          </button>

          <button
            type="button"
            onClick={onShare}
            title="Compartilhar foto"
            aria-label="Compartilhar foto"
            className="w-11 h-11 flex items-center justify-center rounded-full text-sage-700 hover:text-sage-900 hover:bg-sage-100 active:scale-95 transition-all">
            <Share2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onDownload}
            title="Baixar foto"
            aria-label="Baixar foto"
            className="w-11 h-11 flex items-center justify-center rounded-full text-sage-700 hover:text-sage-900 hover:bg-sage-100 active:scale-95 transition-all">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {post.caption && (
        <p className="text-sm sm:text-base text-sage-800/95 leading-relaxed pt-0.5">
          <span className="font-bold text-sage-900 mr-2">{post.authorName}</span>
          {post.caption}
        </p>
      )}
    </div>
  )
}
