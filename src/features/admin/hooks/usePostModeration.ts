import { useMemo, useState } from 'react'

import {
  CLEAR_FEED_CONFIRMATION,
  DESTRUCTIVE_DIALOG,
  POSTS_PER_PAGE,
} from '@/features/admin/constants'
import { getPostRepository } from '@/services/repositories.factory'

import type { AdminData } from '@/features/admin/hooks/useAdminData'
import type { PhotoModerationFilter } from '@/features/admin/types'
import type { Dialog } from '@/hooks/useDialog'
import type { Post } from '@/types/domain'

/** Post filter and actions, as returned by {@link usePostModeration}. */
export interface PostModeration {
  /** Posts of the selected filter on the current page. */
  readonly pagePosts: readonly Post[]
  /** Current page, starting at 1. */
  readonly page: number
  readonly pageCount: number
  readonly setPage: (page: number) => void
  readonly filter: PhotoModerationFilter
  /** Selects a filter and goes back to its first page. */
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
  const [filter, setFilterState] = useState<PhotoModerationFilter>('all')
  const [requestedPage, setPage] = useState(1)
  const postRepository = getPostRepository()

  const setFilter = (nextFilter: PhotoModerationFilter) => {
    setFilterState(nextFilter)
    setPage(1)
  }

  const toggleApproval = async (postId: string) => {
    try {
      const isApproved = await postRepository.togglePostApproval(postId)
      setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, isApproved } : post)))
    } catch {
      void notify('Não foi possível alterar a visibilidade do post.')
    }
  }

  const deletePost = async (postId: string) => {
    const isConfirmed = await confirm({
      ...DESTRUCTIVE_DIALOG,
      title: 'Excluir post?',
      message: 'Este post será removido permanentemente do feed e do telão.',
      confirmLabel: 'Excluir Post',
    })
    if (!isConfirmed) return

    try {
      await postRepository.deletePostAsAdmin(postId)
      setPosts((prev) => prev.filter((post) => post.id !== postId))
    } catch {
      void notify('Não foi possível excluir o post. Tente novamente.')
    }
  }

  const clearFeed = async () => {
    const isConfirmed = await confirm({
      ...DESTRUCTIVE_DIALOG,
      title: 'Zerar o feed?',
      message: `Todas as publicações, com suas fotos e vídeos, serão apagadas para sempre, inclusive os arquivos. Digite ${CLEAR_FEED_CONFIRMATION} para confirmar.`,
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

  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE))
  // Moderating the last post of a page can leave the requested page out of range
  const page = Math.min(requestedPage, pageCount)
  const pagePosts = filteredPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE)

  return {
    pagePosts,
    page,
    pageCount,
    setPage,
    filter,
    setFilter,
    toggleApproval,
    deletePost,
    clearFeed,
  }
}
