import { CheckCircle2, Loader2, Mail, Plus, ShieldAlert, UserPlus } from 'lucide-react'
import { useId } from 'react'

import type { CeremonialistAdmin } from '@/features/admin/hooks/useCeremonialists'

interface CeremonialistFormProps {
  readonly ceremonialistAdmin: CeremonialistAdmin
}

/** Form that grants ceremonialist access to an email. */
export function CeremonialistForm({ ceremonialistAdmin }: CeremonialistFormProps) {
  const { draft, updateDraft, isAdding, feedback, addCeremonialist } = ceremonialistAdmin
  const id = useId()

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-sage-200 space-y-4 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-serif text-lg font-bold text-sage-900 leading-tight">
            Conceder Acesso de Cerimonial
          </h3>
          <p className="text-xs text-sage-700 mt-0.5">
            Adicione e-mails da assessoria/cerimonial para que possam moderar fotos e gerenciar
            desafios.
          </p>
        </div>
      </div>

      {feedback?.type === 'error' && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{feedback.message}</span>
        </div>
      )}

      {feedback?.type === 'success' && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{feedback.message}</span>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void addCeremonialist()
        }}
        className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:pt-2">
        <div className="sm:col-span-6">
          <label
            htmlFor={`${id}-email`}
            className="text-xs font-semibold text-sage-800 block mb-1.5">
            E-mail do Cerimonialista *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage-700" />
            <input
              type="email"
              required
              id={`${id}-email`}
              value={draft.email}
              onChange={(event) => updateDraft({ email: event.target.value })}
              placeholder="cerimonial@assessoria.com.br"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-sage-200 text-base sm:text-xs text-sage-900 placeholder:text-sage-800/40 focus:outline-none focus:ring-2 focus:ring-sage-800/30"
            />
          </div>
        </div>

        <div className="sm:col-span-4">
          <label
            htmlFor={`${id}-name`}
            className="text-xs font-semibold text-sage-800 block mb-1.5">
            Nome / Identificação (Opcional)
          </label>
          <input
            type="text"
            id={`${id}-name`}
            value={draft.name}
            onChange={(event) => updateDraft({ name: event.target.value })}
            placeholder="Ex: Equipe de Cerimonial"
            className="w-full px-4 py-2.5 rounded-2xl border border-sage-200 text-base sm:text-xs text-sage-900 placeholder:text-sage-800/40 focus:outline-none focus:ring-2 focus:ring-sage-800/30"
          />
        </div>

        <div className="sm:col-span-2 flex items-end">
          <button
            type="submit"
            disabled={isAdding || !draft.email.trim()}
            className="w-full py-2.5 px-4 rounded-2xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs h-11">
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Conceder</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
