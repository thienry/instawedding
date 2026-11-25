import { resolvePostMediaType } from '@/utils/video'

import type { Post } from '@/types/domain'

const KNOWN_EXTENSION = /\.(jpe?g|png|webp|mp4|webm|mov|m4v)(?:[?#]|$)/i

/** Extension of the media of a post, without the dot, as in its URL. */
export function getMediaExtension(post: Pick<Post, 'mediaUrl' | 'mediaType'>): string {
  const extension = KNOWN_EXTENSION.exec(post.mediaUrl)?.[1]?.toLowerCase()
  return extension ?? (resolvePostMediaType(post) === 'video' ? 'mp4' : 'webp')
}
