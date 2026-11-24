import { Download, Heart, Share2, Sparkles } from 'lucide-react'

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
    <div className="p-4 sm:px-5 sm:py-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleLike}
            title={isSignedIn ? 'Curtir foto' : 'Entre com Google para curtir'}
            className="inline-flex items-center gap-2 px-3 py-1.5 -ml-2 rounded-full text-base font-bold text-sage-900 hover:bg-rose-50/70 active:scale-95 transition-all">
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
            className="p-2 rounded-full text-sage-800/75 hover:text-sage-900 hover:bg-sage-100 active:scale-95 transition-all">
            <Share2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onDownload}
            title="Baixar foto"
            className="p-2 rounded-full text-sage-800/75 hover:text-sage-900 hover:bg-sage-100 active:scale-95 transition-all">
            <Download className="w-5 h-5" />
          </button>
        </div>

        {post.challengeId && (
          <span className="text-xs font-medium text-sage-800/70 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-gold-500" />
            Desafio Concluído
          </span>
        )}
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
