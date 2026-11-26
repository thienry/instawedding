import { Loader2, Plus } from 'lucide-react'
import { useId } from 'react'

import type { ChallengeAdmin } from '@/features/admin/hooks/useChallenges'

interface ChallengeFormProps {
  readonly challengeAdmin: ChallengeAdmin
}

/** Form that adds a challenge to the party. */
export function ChallengeForm({ challengeAdmin }: ChallengeFormProps) {
  const { draft, updateDraft, isCreating, createChallenge } = challengeAdmin
  const id = useId()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void createChallenge()
      }}
      className="w-full bg-white rounded-3xl p-4 sm:p-6 border border-sage-200 shadow-xs space-y-4">
      <h4 className="text-sm font-bold uppercase tracking-wider text-sage-900 flex items-center gap-2">
        <Plus className="w-4 h-4 text-gold-600" />
        <span>Criar Desafio ou Momento</span>
      </h4>

      <div className="grid grid-cols-4 lg:grid-cols-12 gap-3 sm:gap-4">
        <div className="col-span-1 lg:col-span-2 xl:col-span-1">
          <label htmlFor={`${id}-icon`} className="text-xs font-bold text-sage-800 block mb-1.5">
            Ícone
          </label>
          <input
            type="text"
            maxLength={4}
            id={`${id}-icon`}
            value={draft.icon}
            onChange={(event) => updateDraft({ icon: event.target.value })}
            placeholder="🥂"
            className="w-full h-11 px-3 rounded-xl border border-sage-200 text-center text-lg bg-white"
          />
        </div>
        <div className="col-span-3 lg:col-span-4 xl:col-span-5">
          <label htmlFor={`${id}-title`} className="text-xs font-bold text-sage-800 block mb-1.5">
            Título do Desafio
          </label>
          <input
            type="text"
            required
            id={`${id}-title`}
            value={draft.title}
            onChange={(event) => updateDraft({ title: event.target.value })}
            placeholder="Ex: Selfie com os Noivos"
            className="w-full h-11 px-3.5 rounded-xl border border-sage-200 text-base sm:text-sm bg-white"
          />
        </div>
        <div className="col-span-4 lg:col-span-6">
          <label
            htmlFor={`${id}-description`}
            className="text-xs font-bold text-sage-800 block mb-1.5">
            Descrição para os Convidados
          </label>
          <input
            type="text"
            required
            id={`${id}-description`}
            value={draft.description}
            onChange={(event) => updateDraft({ description: event.target.value })}
            placeholder="Ex: Tire uma selfie divertida ao lado de Thiago & Priscila!"
            className="w-full h-11 px-3.5 rounded-xl border border-sage-200 text-base sm:text-sm bg-white"
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5 min-h-11 text-sm text-sage-900 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.isMoment}
          onChange={(event) => updateDraft({ isMoment: event.target.checked })}
          className="w-5 h-5 accent-sage-900 shrink-0"
        />
        <span>
          <span className="font-bold">Momento da festa</span>
          <span className="text-sage-700"> · o cerimonial coloca no ar na hora</span>
        </span>
      </label>

      <button
        type="submit"
        disabled={isCreating}
        className="w-full py-3 px-4 rounded-xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
        {isCreating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Salvando...</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            <span>{draft.isMoment ? 'Adicionar Momento' : 'Adicionar Desafio à Festa'}</span>
          </>
        )}
      </button>
    </form>
  )
}
