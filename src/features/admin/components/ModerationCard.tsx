import { Eye, EyeOff, Trash2 } from 'lucide-react'

import { formatRelativeTime } from '@/utils/relative-time'
import { resolvePostMediaType } from '@/utils/video'

import type { Post } from '@/types/domain'

interface ModerationCardProps {
  readonly post: Post
  readonly onToggleApproval: () => void
  /** Deletes the post. Omit to hide the button. */
  readonly onDelete?: () => void
}

/** Post summary with its moderation actions. */
export function ModerationCard({ post, onToggleApproval, onDelete }: ModerationCardProps) {
  const { isApproved } = post
  const isVideo = resolvePostMediaType(post) === 'video'

  return (
    <div
      className={`p-3 sm:p-4 rounded-3xl border transition-all flex items-center gap-3 sm:gap-4 bg-white shadow-2xs ${
        isApproved ? 'border-sage-200' : 'border-rose-300 bg-rose-50/25'
      }`}>
      <div className="w-14 h-14 min-[360px]:w-18 min-[360px]:h-18 rounded-2xl overflow-hidden bg-sage-100 shrink-0 border border-sage-200 relative">
        {isVideo ? (
          <video
            src={post.mediaUrl}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={post.mediaUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h5 className="text-sm sm:text-base font-bold text-sage-900 truncate max-w-full">
            {post.authorName}
          </h5>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
              isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
            {isApproved ? 'Visível' : 'Oculto'}
          </span>
        </div>

        {post.caption && (
          <p className="text-xs sm:text-sm text-sage-800/80 truncate">{post.caption}</p>
        )}

        <p className="text-xs text-sage-700">{formatRelativeTime(post.createdAt)}</p>
      </div>

      <div className="flex items-center -mr-1.5 sm:mr-0 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onToggleApproval}
          title={isApproved ? 'Ocultar' : 'Mostrar'}
          aria-label={isApproved ? 'Ocultar' : 'Mostrar'}
          className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors ${
            isApproved
              ? 'text-sage-800 hover:bg-sage-100'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}>
          {isApproved ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Excluir Definitivamente (Apenas Admin)"
            aria-label="Excluir definitivamente"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
