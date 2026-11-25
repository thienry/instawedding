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
    <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-2">
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
          <div className="flex items-center gap-1.5 min-w-0 mt-0.5 text-xs text-sage-700">
            <span className="shrink-0">{formatRelativeTime(post.createdAt)}</span>
            {post.challenge && (
              <>
                <span aria-hidden="true">•</span>
                <button
                  type="button"
                  onClick={onSelectChallenge}
                  className="touch-target min-w-0 inline-flex items-center gap-1 font-semibold text-gold-600 hover:underline">
                  <span>{post.challenge.icon}</span>
                  <span className="truncate">{post.challenge.title}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Excluir minha publicação"
          aria-label="Excluir minha publicação"
          className="shrink-0 touch-target p-2 rounded-full text-sage-700 hover:text-rose-600 hover:bg-rose-50 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
