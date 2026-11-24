import { useMemo, useState } from 'react'

import { CLEAR_FEED_CONFIRMATION, DESTRUCTIVE_DIALOG } from '@/features/admin/constants'
import { getPostRepository } from '@/services/repositories.factory'

import type { AdminData } from '@/features/admin/hooks/useAdminData'
import type { PhotoModerationFilter } from '@/features/admin/types'
import type { Dialog } from '@/hooks/useDialog'
import type { Post } from '@/types/domain'

/** Post filter and actions, as returned by {@link usePostModeration}. */
export interface PostModeration {
  readonly filteredPosts: readonly Post[]
  readonly filter: PhotoModerationFilter
  readonly setFilter: (filter: PhotoModerationFilter) => void
  readonly toggleApproval: (postId: string) => Promise<void>
  /** Deletes a post after confirmation. */
  readonly deletePost: (postId: string) => Promise<void>
  /** Deletes every post after the admin types the confirmation word. */
  readonly clearFeed: () => Promise<void>
}

/**
 * Filters and moderates the posts. Failures are shown in a dialog and leave the
 * list untouched.
 *
 * @param data - Dashboard data that holds the posts.
 * @param dialog - Dialogs used to confirm actions and report failures.
 */
export function usePostModeration(
  { posts, setPosts }: Pick<AdminData, 'posts' | 'setPosts'>,
  { confirm, notify }: Dialog
): PostModeration {
  const [filter, setFilter] = useState<PhotoModerationFilter>('all')
  const postRepository = getPostRepository()

  const toggleApproval = async (postId: string) => {
    try {
      const isApproved = await postRepository.togglePostApproval(postId)
      setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, isApproved } : post)))
    } catch {
      void notify('Não foi possível alterar a visibilidade da foto.')
    }
  }

  const deletePost = async (postId: string) => {
    const isConfirmed = await confirm({
      ...DESTRUCTIVE_DIALOG,
      title: 'Excluir foto?',
      message: 'Esta foto será removida permanentemente do feed e do telão.',
      confirmLabel: 'Excluir Foto',
    })
    if (!isConfirmed) return

    try {
      await postRepository.deletePostAsAdmin(postId)
      setPosts((prev) => prev.filter((post) => post.id !== postId))
    } catch {
      void notify('Não foi possível excluir a foto. Tente novamente.')
    }
  }

  const clearFeed = async () => {
    const isConfirmed = await confirm({
      ...DESTRUCTIVE_DIALOG,
      title: 'Zerar o feed?',
      message: `Todas as fotos serão apagadas do banco. Digite ${CLEAR_FEED_CONFIRMATION} para confirmar.`,
      confirmLabel: 'Zerar Feed',
      requiredText: CLEAR_FEED_CONFIRMATION,
    })
    if (!isConfirmed) return

    try {
      await postRepository.clearAllPosts()
      setPosts([])
    } catch {
      void notify('Não foi possível zerar o feed. Tente novamente.')
    }
  }

  const filteredPosts = useMemo(() => {
    if (filter === 'all') return posts
    return posts.filter((post) => post.isApproved === (filter === 'approved'))
  }, [posts, filter])

  return {
    filteredPosts,
    filter,
    setFilter,
    toggleApproval,
    deletePost,
    clearFeed,
  }
}
