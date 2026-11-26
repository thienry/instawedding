import { Ban, Loader2, Plus, X } from 'lucide-react'
import { useId } from 'react'

import type { BannedTermsAdmin } from '@/features/admin/hooks/useBannedTerms'

interface BannedTermsCardProps {
  readonly bannedTerms: BannedTermsAdmin
}

/** Terms that keep a post off the projector, while the feed still shows it. */
export function BannedTermsCard({ bannedTerms }: BannedTermsCardProps) {
  const { terms, draft, setDraft, isSaving, addTerm, removeTerm } = bannedTerms
  const id = useId()

  return (
    <section className="bg-white rounded-3xl p-4 sm:p-6 border border-sage-200 shadow-xs space-y-3">
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wider text-sage-900 flex items-center gap-2">
          <Ban className="w-4 h-4 text-rose-600" />
          <span>Termos banidos do telão</span>
        </h4>
        <p className="mt-1 text-xs sm:text-sm text-sage-700">
          Posts com estes termos na legenda ou no nome não aparecem no telão. O feed continua
          mostrando. Maiúsculas e acentos não importam.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void addTerm()
        }}
        className="flex gap-2">
        <label htmlFor={`${id}-term`} className="sr-only">
          Novo termo
        </label>
        <input
          id={`${id}-term`}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ex: palavrão"
          className="flex-1 min-w-0 h-11 px-3.5 rounded-xl border border-sage-200 text-base sm:text-sm bg-white"
        />
        <button
          type="submit"
          disabled={isSaving || !draft.trim()}
          className="min-h-11 px-4 rounded-xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>Adicionar</span>
        </button>
      </form>

      {terms.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {terms.map((term) => (
            <li
              key={term}
              className="flex items-center gap-1 pl-3 rounded-full bg-rose-50 border border-rose-200 text-sm text-rose-900">
              <span>{term}</span>
              <button
                type="button"
                onClick={() => void removeTerm(term)}
                aria-label={`Remover ${term}`}
                title={`Remover ${term}`}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-rose-100">
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-sage-700">Nenhum termo na lista.</p>
      )}
    </section>
  )
}
