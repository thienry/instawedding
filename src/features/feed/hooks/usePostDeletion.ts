import { useState } from 'react'

import { getPostRepository } from '@/services/repositories.factory'

import type { Dialog } from '@/hooks/useDialog'
import type { Post } from '@/types/domain'

/** Deletion flow, as returned by {@link usePostDeletion}. */
export interface PostDeletion {
  /** Post waiting for confirmation, or `null`. */
  readonly postToDelete: Post | null
  readonly isDeleting: boolean
  readonly requestDeletion: (post: Post) => void
  readonly cancelDeletion: () => void
  readonly confirmDeletion: () => Promise<void>
}

/**
 * Lets guests delete their own posts (LGPD right to erasure).
 *
 * @param onDeleted - Called with the id once the post is gone.
 * @param dialog - Dialog used to report failures.
 */
export function usePostDeletion(
  onDeleted: (postId: string) => void,
  { notify }: Pick<Dialog, 'notify'>
): PostDeletion {
  const [postToDelete, setPostToDelete] = useState<Post | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const postRepository = getPostRepository()

  const confirmDeletion = async () => {
    if (!postToDelete) return
    setIsDeleting(true)
    try {
      await postRepository.deletePost(postToDelete.id)
      onDeleted(postToDelete.id)
      setPostToDelete(null)
    } catch {
      void notify('Não foi possível excluir a publicação. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    postToDelete,
    isDeleting,
    requestDeletion: setPostToDelete,
    cancelDeletion: () => setPostToDelete(null),
    confirmDeletion,
  }
}
