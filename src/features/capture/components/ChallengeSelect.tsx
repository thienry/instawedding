import type { PostDraft } from '@/features/capture/hooks/usePostDraft'

interface ChallengeSelectProps {
  readonly draft: PostDraft
}

/** Challenge the post counts for. */
export function ChallengeSelect({ draft }: ChallengeSelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-bold text-sage-900 flex items-center justify-between">
        <span>Vincular a um Desafio</span>
        <span className="text-sage-800/50 font-normal text-xs">(opcional)</span>
      </label>
      <select
        value={draft.challengeId ?? ''}
        onChange={(e) =>
          draft.setChallengeId(e.target.value ? Number(e.target.value) : null)
        }
        className="w-full px-4 py-3 rounded-xl border border-sage-200 bg-sage-50/50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-800/20"
      >
        <option value="">Nenhum desafio (Publicação livre)</option>
        {draft.challenges.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {c.title}
          </option>
        ))}
      </select>
    </div>
  )
}
