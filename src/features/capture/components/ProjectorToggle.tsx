import { Tv } from 'lucide-react'

import type { PostDraft } from '@/features/capture/hooks/usePostDraft'

interface ProjectorToggleProps {
  readonly draft: PostDraft
}

/** Whether the post appears on the party projector. */
export function ProjectorToggle({ draft }: ProjectorToggleProps) {
  return (
    <div className="p-3.5 sm:p-4 rounded-2xl border border-sage-200 bg-sage-50/70 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden sm:block p-2 sm:p-2.5 rounded-xl bg-gold-400/20 text-sage-900 shrink-0">
          <Tv className="w-5 h-5 text-gold-600" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-sage-900">Exibir no Telão da Festa</span>
            <span className="hidden sm:inline text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
              Ao vivo
            </span>
          </div>
          <p className="text-xs text-sage-700 mt-0.5">
            Transmitir automaticamente no telão do casamento após o envio.
          </p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={draft.showOnProjector}
          onChange={(e) => draft.setShowOnProjector(e.target.checked)}
          aria-label="Exibir no Telão da Festa"
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-300 peer-focus-visible:ring-2 peer-focus-visible:ring-sage-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sage-900"></div>
      </label>
    </div>
  )
}
