import { Loader2, Trash2 } from 'lucide-react'

import type { PostDeletion } from '@/features/feed/hooks/usePostDeletion'

interface DeletePostModalProps {
  readonly deletion: PostDeletion
}

/** Confirms the deletion of the guest's own post. */
export function DeletePostModal({ deletion }: DeletePostModalProps) {
  const { postToDelete, isDeleting, cancelDeletion, confirmDeletion } = deletion

  if (!postToDelete) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-sage-200 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="font-serif text-lg font-bold text-sage-900">Excluir post?</h3>
          <p className="text-sm text-sage-700 leading-relaxed">
            Este post será removido permanentemente do feed e do telão da festa (Direito de
            eliminação - LGPD Art. 18).
          </p>
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            disabled={isDeleting}
            onClick={cancelDeletion}
            className="flex-1 py-3 px-4 rounded-xl border border-sage-200 text-sm font-semibold text-sage-800 hover:bg-sage-100 transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => void confirmDeletion()}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5">
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <span>Excluir Post</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
