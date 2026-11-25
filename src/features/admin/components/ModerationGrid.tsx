import { useRef } from 'react'

import { ModerationCard } from '@/features/admin/components/ModerationCard'
import { Pagination } from '@/features/admin/components/Pagination'

import type { PostModeration } from '@/features/admin/hooks/usePostModeration'

interface ModerationGridProps {
  readonly moderation: PostModeration
  readonly isLoading: boolean
  readonly isAdmin: boolean
}

/** Current page of the selected filter, ready to be moderated. */
export function ModerationGrid({ moderation, isLoading, isAdmin }: ModerationGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const { pagePosts, page, pageCount, setPage, toggleApproval, deletePost } = moderation

  if (isLoading) {
    return <p className="text-sm text-center text-sage-700 py-8">Carregando fila de postagens...</p>
  }

  if (pagePosts.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-sage-700 bg-white rounded-3xl border border-sage-200 shadow-xs">
        Nenhuma foto encontrada neste filtro.
      </div>
    )
  }

  const changePage = (nextPage: number) => {
    setPage(nextPage)
    gridRef.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <>
      <div ref={gridRef} className="grid grid-cols-1 xl:grid-cols-2 gap-4 scroll-mt-24">
        {pagePosts.map((post) => (
          <ModerationCard
            key={post.id}
            post={post}
            onToggleApproval={() => void toggleApproval(post.id)}
            onDelete={isAdmin ? () => void deletePost(post.id) : undefined}
          />
        ))}
      </div>
      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onChange={changePage} />}
    </>
  )
}
