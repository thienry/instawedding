import { useState } from 'react'

export type AuthorAvatarSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<AuthorAvatarSize, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
  xl: 'w-18 h-18 text-xl',
}

interface AuthorAvatarProps {
  readonly name: string
  readonly avatarUrl?: string | null
  readonly size?: AuthorAvatarSize
  readonly sizeClassName?: string
  readonly fallbackClassName?: string
}

export function AuthorAvatar({
  name,
  avatarUrl,
  size = 'lg',
  sizeClassName,
  fallbackClassName = 'bg-sage-900 text-gold-400',
}: AuthorAvatarProps) {
  const resolvedSizeClass = sizeClassName ?? SIZE_CLASSES[size]
  const [hasError, setHasError] = useState(false)
  const initial = (name.trim().charAt(0) || 'C').toUpperCase()

  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={`${resolvedSizeClass} rounded-full object-cover shrink-0 shadow-2xs border border-sage-200/80`}
      />
    )
  }

  return (
    <div
      className={`${resolvedSizeClass} ${fallbackClassName} rounded-full font-serif font-bold flex items-center justify-center shrink-0 shadow-2xs`}
    >
      {initial}
    </div>
  )
}
