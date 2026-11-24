import { ModerationCard } from '@/features/admin/components/ModerationCard'

import type { PostModeration } from '@/features/admin/hooks/usePostModeration'

interface ModerationGridProps {
  readonly moderation: PostModeration
  readonly isLoading: boolean
  readonly isAdmin: boolean
}

/** Posts of the selected filter, ready to be moderated. */
export function ModerationGrid({ moderation, isLoading, isAdmin }: ModerationGridProps) {
  const { filteredPosts, toggleApproval, deletePost } = moderation

  if (isLoading) {
    return (
      <p className="text-sm text-center text-sage-800/60 py-8">Carregando fila de postagens...</p>
    )
  }

  if (filteredPosts.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-sage-800/65 bg-white rounded-3xl border border-sage-200 shadow-xs">
        Nenhuma foto encontrada neste filtro.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {filteredPosts.map((post) => (
        <ModerationCard
          key={post.id}
          post={post}
          onToggleApproval={() => void toggleApproval(post.id)}
          onDelete={isAdmin ? () => void deletePost(post.id) : undefined}
        />
      ))}
    </div>
  )
}
