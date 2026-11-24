import { ArrowUp, Sparkles, X } from 'lucide-react'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'

import type { FeedNotificationState } from '@/services/feed-notification/notification-state'

function describeUnread(count: number, isLive: boolean): string {
  if (isLive) {
    return count === 1 ? '1 nova foto postada' : `${count} novas fotos postadas`
  }
  return count === 1
    ? '1 nova foto desde sua última visita'
    : `${count} novas fotos desde sua última visita`
}

interface NewPostsPillProps {
  readonly notifications: FeedNotificationState
  readonly onReveal: () => void
  readonly onDismiss: () => void
}

/** Floating notice of posts that arrived live or since the last visit. */
export function NewPostsPill({ notifications, onReveal, onDismiss }: NewPostsPillProps) {
  const { stagedPosts, totalUnreadCount, latestAuthors } = notifications
  const hasStagedPosts = stagedPosts.length > 0

  if (totalUnreadCount === 0) return null

  return (
    <div className="sticky top-18 lg:top-4 z-20 flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="pointer-events-auto inline-flex items-center gap-2 pl-3 pr-2 py-2 rounded-full bg-sage-900/95 text-white shadow-xl border border-gold-400/40 backdrop-blur-md">
        <button
          type="button"
          onClick={onReveal}
          className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-semibold hover:text-gold-400 transition-colors cursor-pointer">
          {hasStagedPosts ? (
            <span className="w-6 h-6 rounded-full bg-gold-400 text-sage-900 flex items-center justify-center shrink-0">
              <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          ) : (
            <span className="w-6 h-6 rounded-full bg-gold-400/20 text-gold-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          )}

          {latestAuthors.length > 0 && (
            <div className="flex items-center -space-x-2 shrink-0">
              {latestAuthors.map((author) => (
                <div key={author.name} className="ring-2 ring-sage-900 rounded-full">
                  <AuthorAvatar
                    name={author.name}
                    avatarUrl={author.avatarUrl}
                    sizeClassName="w-6 h-6 text-[11px]"
                    fallbackClassName="bg-gold-400 text-sage-900"
                  />
                </div>
              ))}
            </div>
          )}

          <span>{describeUnread(totalUnreadCount, hasStagedPosts)}</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          title="Marcar como vistas"
          aria-label="Marcar novas fotos como vistas"
          className="touch-target p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
