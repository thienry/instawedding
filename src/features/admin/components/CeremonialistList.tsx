import { Trash2, Users } from 'lucide-react'

import type { CeremonialistAdmin } from '@/features/admin/hooks/useCeremonialists'

interface CeremonialistListProps {
  readonly ceremonialistAdmin: CeremonialistAdmin
}

/** Accounts with ceremonialist access. */
export function CeremonialistList({ ceremonialistAdmin }: CeremonialistListProps) {
  const { ceremonialists, removeCeremonialist } = ceremonialistAdmin

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-sage-200 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold text-sage-900">
            Cerimonialistas Cadastrados ({ceremonialists.length})
          </h3>
          <p className="text-xs text-sage-800/70">
            Usuários com acesso concedido entram no painel de moderação com papel de Cerimonial.
          </p>
        </div>
      </div>

      {ceremonialists.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-sage-200 rounded-2xl space-y-2">
          <Users className="w-8 h-8 text-sage-800/40 mx-auto" />
          <p className="text-xs text-sage-800/70">
            Nenhum cerimonialista cadastrado ainda. Adicione o primeiro e-mail no formulário acima.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-sage-100">
          {ceremonialists.map((ceremonialist) => (
            <div
              key={ceremonialist.id}
              className="py-3.5 flex items-center justify-between gap-3 first:pt-1 last:pb-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-900 font-bold flex items-center justify-center border border-sage-200 text-sm shrink-0">
                  {(ceremonialist.name || ceremonialist.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-sage-900 truncate">
                      {ceremonialist.name || ceremonialist.email}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sage-200 text-sage-800 shrink-0">
                      🛡️ Cerimonial
                    </span>
                  </div>
                  <p className="text-xs text-sage-800/65 truncate">{ceremonialist.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void removeCeremonialist(ceremonialist)}
                title="Revogar Acesso"
                className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
