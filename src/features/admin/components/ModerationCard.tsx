import { Eye, EyeOff, Monitor, MonitorOff, Trash2 } from 'lucide-react'

import { formatRelativeTime } from '@/utils/relative-time'
import { resolvePostMediaType } from '@/utils/video'

import type { ProjectorStatus } from '@/features/admin/utils/projector-status'
import type { Post } from '@/types/domain'

const OFF_PROJECTOR_REASONS = {
  guest: 'O convidado preferiu não mostrar no telão',
  moderator: 'Tirado do telão pela moderação',
} as const

interface ModerationCardProps {
  readonly post: Post
  readonly projectorStatus: ProjectorStatus
  readonly onToggleApproval: () => void
  readonly onToggleProjector: () => void
  /** Deletes the post. Omit to hide the button. */
  readonly onDelete?: () => void
}

/** Post summary with its moderation actions. */
export function ModerationCard({
  post,
  projectorStatus,
  onToggleApproval,
  onToggleProjector,
  onDelete,
}: ModerationCardProps) {
  const { isApproved } = post
  const isVideo = resolvePostMediaType(post) === 'video'
  const isOffProjector = projectorStatus.kind !== 'shown'
  const projectorNote =
    projectorStatus.kind === 'term'
      ? `Termo banido: “${projectorStatus.term}”`
      : projectorStatus.kind === 'shown'
        ? projectorStatus.releasedTerm &&
          `Liberado no telão apesar de “${projectorStatus.releasedTerm}”`
        : OFF_PROJECTOR_REASONS[projectorStatus.kind]
  const projectorLabel = isOffProjector ? 'Voltar ao telão' : 'Tirar do telão'

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
          {isApproved && isOffProjector && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0 bg-gold-400/20 text-sage-900">
              Fora do telão
            </span>
          )}
        </div>

        {post.caption && (
          <p className="text-xs sm:text-sm text-sage-800/80 truncate">{post.caption}</p>
        )}

        <p className="text-xs text-sage-700">
          {formatRelativeTime(post.createdAt)}
          {isApproved && projectorNote && ` · ${projectorNote}`}
        </p>
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

        {projectorStatus.kind !== 'guest' && (
          <button
            type="button"
            onClick={onToggleProjector}
            title={projectorLabel}
            aria-label={projectorLabel}
            aria-pressed={isOffProjector}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors ${
              isOffProjector
                ? 'text-sage-900 bg-gold-400/20 hover:bg-gold-400/30'
                : 'text-sage-800 hover:bg-sage-100'
            }`}>
            {isOffProjector ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
          </button>
        )}

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
