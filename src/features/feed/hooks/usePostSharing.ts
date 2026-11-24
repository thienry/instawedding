import { useState } from 'react'

import { downloadBlob } from '@/utils/download'
import { slugify } from '@/utils/slug'
import { resolvePostMediaType } from '@/utils/video'

import type { Post } from '@/types/domain'

const TOAST_MS = 2800
const SHARE_TITLE = 'Casamento de Thiago & Priscila'

/** Share and download actions, as returned by {@link usePostSharing}. */
export interface PostSharing {
  /** Downloads the media, or opens it in a tab if that fails. */
  readonly downloadPost: (post: Post) => Promise<void>
  /** Shares natively, or else copies the link, or else downloads. */
  readonly sharePost: (post: Post) => Promise<void>
  /** Confirmation to show, or `null`. */
  readonly toastMessage: string | null
}

function downloadName(post: Post): string {
  const author = slugify(post.authorName) || 'convidado'
  const extension = resolvePostMediaType(post) === 'video' ? 'mp4' : 'webp'
  return `casamento-thiago-e-priscila-${author}-${post.id.slice(0, 6)}.${extension}`
}

async function shareNatively(post: Post, url: string): Promise<boolean> {
  if (!navigator.share) return false
  const text = post.caption
    ? `Foto de ${post.authorName}: "${post.caption}"`
    : `Foto de ${post.authorName} no casamento de Thiago & Priscila!`
  try {
    await navigator.share({ title: SHARE_TITLE, text, url })
    return true
  } catch (error) {
    // Closing the share sheet is a choice, not a failure
    return error instanceof DOMException && error.name === 'AbortError'
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Shares and downloads posts. */
export function usePostSharing(): PostSharing {
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const downloadPost = async (post: Post) => {
    try {
      const response = await fetch(post.mediaUrl)
      downloadBlob(await response.blob(), downloadName(post))
    } catch {
      window.open(post.mediaUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const sharePost = async (post: Post) => {
    const url = `${window.location.origin}/?photoId=${encodeURIComponent(post.id)}`
    if (await shareNatively(post, url)) return

    if (await copyToClipboard(url)) {
      setToastMessage('Link da foto copiado!')
      window.setTimeout(() => setToastMessage(null), TOAST_MS)
      return
    }

    await downloadPost(post)
  }

  return { downloadPost, sharePost, toastMessage }
}
