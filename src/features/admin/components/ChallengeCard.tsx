import { Eye, EyeOff, Trash2 } from 'lucide-react'

import type { Challenge } from '@/types/domain'

interface ChallengeCardProps {
  readonly challenge: Challenge
  readonly onToggle: () => void
  /** Deletes the challenge. Omit to hide the button. */
  readonly onDelete?: () => void
}

/** Challenge summary with its actions. */
export function ChallengeCard({ challenge, onToggle, onDelete }: ChallengeCardProps) {
  const { icon, title, description, isActive } = challenge

  return (
    <div
      className={`p-4 rounded-3xl border bg-white flex items-center justify-between gap-4 shadow-2xs ${
        isActive ? 'border-sage-200' : 'border-sage-200/50 opacity-60'
      }`}>
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-12 h-12 rounded-2xl bg-sage-50 border border-sage-200 flex items-center justify-center text-2xl shrink-0">
          {icon}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <h5 className="text-sm sm:text-base font-bold text-sage-900 truncate">{title}</h5>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}>
              {isActive ? 'Ativo' : 'Pausado'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-sage-700 truncate">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onToggle}
          title={isActive ? 'Pausar Desafio' : 'Ativar Desafio'}
          className="p-2.5 rounded-xl text-sage-800 hover:bg-sage-100 transition-colors">
          {isActive ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Excluir Desafio"
            className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
