import { Download, Heart, Share2, Sparkles, X } from 'lucide-react'
import { useEffect } from 'react'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { resolvePostMediaType } from '@/utils/video'

import type { Post } from '@/types/domain'

interface PhotoLightboxModalProps {
  readonly post: Post | null
  readonly isLiked: boolean
  readonly onClose: () => void
  readonly onToggleLike: (postId: string) => void
  readonly onDownload: (post: Post) => void
  readonly onShare: (post: Post) => void
}

export function PhotoLightboxModal({
  post,
  isLiked,
  onClose,
  onToggleLike,
  onDownload,
  onShare,
}: PhotoLightboxModalProps) {
  useEffect(() => {
    if (!post) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [post, onClose])

  if (!post) return null

  const isVideo = resolvePostMediaType(post) === 'video'

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in duration-150 overflow-hidden"
      onClick={onClose}>
      {/* Ambient Color-Matched Blurred Backdrop of the Media itself */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
        {isVideo ? (
          <video
            src={post.mediaUrl}
            muted
            loop
            playsInline
            autoPlay
            className="w-full h-full object-cover scale-125 blur-3xl opacity-35 saturate-150"
          />
        ) : (
          <img
            src={post.mediaUrl}
            alt=""
            className="w-full h-full object-cover scale-125 blur-3xl opacity-35 saturate-150"
          />
        )}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Top Bar */}
      <div
        className="relative z-10 flex items-center justify-between text-white max-w-2xl w-full mx-auto pt-1"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5">
          <AuthorAvatar
            name={post.authorName}
            avatarUrl={post.authorAvatarUrl}
            sizeClassName="w-10 h-10 text-sm"
            fallbackClassName="bg-white/15 text-white border border-white/25"
          />
          <div>
            <h3 className="text-sm font-bold leading-tight">{post.authorName}</h3>
            {post.challenge && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gold-400 font-medium">
                <Sparkles className="w-3 h-3" />
                <span>
                  {post.challenge.icon} {post.challenge.title}
                </span>
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Fechar visualização">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Media */}
      <div
        className="relative z-10 flex-1 flex items-center justify-center my-3 overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <video
            src={post.mediaUrl}
            controls
            autoPlay
            loop
            playsInline
            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <img
            src={post.mediaUrl}
            alt={post.caption || `Foto por ${post.authorName}`}
            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl select-none"
          />
        )}
      </div>

      {/* Bottom Controls & Caption */}
      <div
        className="relative z-10 max-w-2xl w-full mx-auto space-y-3 pb-2 text-white"
        onClick={(e) => e.stopPropagation()}>
        {post.caption && (
          <p className="text-xs sm:text-sm text-white/90 text-center leading-relaxed px-2">
            &ldquo;{post.caption}&rdquo;
          </p>
        )}

        <div className="flex items-center justify-between bg-white/10 border border-white/15 rounded-2xl px-4 py-2.5 backdrop-blur-xs">
          <button
            type="button"
            onClick={() => onToggleLike(post.id)}
            className="flex items-center gap-2 text-xs font-semibold text-white hover:opacity-80 active:scale-95 transition-all">
            <Heart
              className={`w-5 h-5 transition-colors ${
                isLiked ? 'fill-rose-500 text-rose-500' : 'text-white stroke-[1.75]'
              }`}
            />
            <span>{post.likesCount} curtidas</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onShare(post)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors">
              <Share2 className="w-4 h-4" />
              <span>Compartilhar</span>
            </button>
            <button
              type="button"
              onClick={() => onDownload(post)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-xs font-semibold text-slate-950 transition-colors">
              <Download className="w-4 h-4" />
              <span>Baixar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
