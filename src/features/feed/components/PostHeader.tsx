import { Trash2 } from 'lucide-react'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { formatRelativeTime } from '@/utils/relative-time'

import type { Post } from '@/types/domain'

interface PostHeaderProps {
  readonly post: Post
  readonly isNew: boolean
  readonly onSelectChallenge: () => void
  /** Deletes the post. Omit to hide the button. */
  readonly onDelete?: () => void
}

/** Author, challenge and deletion button of a post. */
export function PostHeader({ post, isNew, onSelectChallenge, onDelete }: PostHeaderProps) {
  return (
    <div className="p-4 sm:px-5 sm:py-4 flex items-center justify-between gap-2">
      <div className="flex items-center space-x-3 min-w-0">
        <AuthorAvatar name={post.authorName} avatarUrl={post.authorAvatarUrl} size="lg" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-sage-900 leading-tight truncate">
              {post.authorName}
            </h4>
            {isNew && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white shrink-0">
                Nova
              </span>
            )}
          </div>
          <span className="text-xs text-sage-800/65 block mt-0.5">
            {formatRelativeTime(post.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {post.challenge && (
          <button
            type="button"
            onClick={onSelectChallenge}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gold-400/15 text-gold-500 border border-gold-400/35 hover:bg-gold-400/25 transition-colors">
            <span className="text-sm">{post.challenge.icon}</span>
            <span className="max-w-36 truncate">{post.challenge.title}</span>
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Excluir minha publicação (LGPD Art. 18)"
            className="p-2 rounded-full text-sage-800/50 hover:text-rose-600 hover:bg-rose-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
