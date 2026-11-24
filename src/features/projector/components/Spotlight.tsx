import { Heart } from 'lucide-react'

import { AuthorAvatar } from '@/components/common/AuthorAvatar'
import { useCrossfade } from '@/features/projector/hooks/useCrossfade'

import type { Slide } from '@/features/projector/types'
import type { Post } from '@/types/domain'
import type { AnimationEvent, CSSProperties } from 'react'

const DEFAULT_CAPTION =
  'Celebrando o amor e a alegria do grande dia de Thiago & Priscila!'
/** Longer captions use smaller text and appear at once instead of by word. */
const MAX_STAGGERED_WORDS = 16

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface SpotlightProps {
  readonly slide: Slide
}

/** Dedication and author of the post on display. */
export function Spotlight({ slide }: SpotlightProps) {
  const { layers, removeLeaving } = useCrossfade(slide)

  return (
    <div className="grid min-h-0 items-center">
      {layers.map(({ slide: { post }, isLeaving }) => (
        <SpotlightText
          key={post.id}
          post={post}
          isLeaving={isLeaving}
          onLeft={removeLeaving}
        />
      ))}
    </div>
  )
}

interface SpotlightTextProps {
  readonly post: Post
  readonly isLeaving: boolean
  /** Called when the leaving animation ends. */
  readonly onLeft: () => void
}

function SpotlightText({ post, isLeaving, onLeft }: SpotlightTextProps) {
  const caption = post.caption || DEFAULT_CAPTION
  const words = caption.split(/\s+/)
  const isLong = words.length > MAX_STAGGERED_WORDS

  const handleAnimationEnd = (event: AnimationEvent) => {
    // Animations of the children bubble up to here
    if (isLeaving && event.target === event.currentTarget) onLeft()
  }

  return (
    <article
      aria-hidden={isLeaving}
      onAnimationEnd={handleAnimationEnd}
      className={`[grid-area:1/1] min-w-0 ${isLeaving ? 'projector-text-leave' : ''}`}
    >
      {post.challenge && (
        <p className="projector-rise mb-[1.6vh] text-sm lg:text-[clamp(0.8rem,1.8vh,1.25rem)] text-gold-400">
          {post.challenge.icon} {post.challenge.title}
        </p>
      )}

      <blockquote
        className={`font-serif italic leading-[1.25] text-pretty line-clamp-2 lg:line-clamp-6 -ml-[0.15em] pl-[0.15em] text-xl ${
          isLong
            ? 'projector-rise lg:text-[clamp(1.1rem,2.9vh,2rem)]'
            : 'lg:text-[clamp(1.35rem,4vh,2.9rem)]'
        }`}
      >
        {isLong
          ? caption
          : words.map((word, index) => (
              <span key={index}>
                <span
                  style={{ '--order': index } as CSSProperties}
                  className="projector-word"
                >
                  {word}
                </span>{' '}
              </span>
            ))}
      </blockquote>

      <div className="projector-rule mt-[2.4vh] h-px bg-gold-400/50" />

      <footer className="projector-rise mt-[2.4vh] flex items-center gap-4">
        <AuthorAvatar
          name={post.authorName}
          avatarUrl={post.authorAvatarUrl}
          sizeClassName="w-11 h-11 lg:w-[6vh] lg:h-[6vh] text-lg"
          fallbackClassName="bg-gold-400 text-sage-900"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-base lg:text-[clamp(1rem,2.5vh,1.75rem)] leading-tight">
            {post.authorName}
          </h2>
          <p className="mt-1 flex items-center gap-3 text-xs lg:text-[clamp(0.75rem,1.7vh,1.125rem)] text-white/65 tabular-nums">
            <time dateTime={post.createdAt}>{formatTime(post.createdAt)}</time>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="w-[1em] h-[1em] fill-current text-rose-300" />
              {post.likesCount} {post.likesCount === 1 ? 'curtida' : 'curtidas'}
            </span>
          </p>
        </div>
      </footer>
    </article>
  )
}
