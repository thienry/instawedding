import { Download, FileSpreadsheet, Loader2, RotateCcw } from 'lucide-react'

import type { AlbumExport } from '@/features/admin/hooks/useAlbumExport'
import type { PostModeration } from '@/features/admin/hooks/usePostModeration'
import type { PhotoModerationFilter } from '@/features/admin/types'
import type { AdminStats } from '@/features/admin/utils/admin-stats'

interface FilterOption {
  readonly id: PhotoModerationFilter
  readonly label: string
  readonly activeClass: string
  readonly idleClass: string
}

const FILTERS: readonly FilterOption[] = [
  {
    id: 'all',
    label: 'Todas',
    activeClass: 'bg-sage-900 text-white',
    idleClass: 'bg-sage-100 text-sage-800 hover:bg-sage-200',
  },
  {
    id: 'approved',
    label: 'Aprovadas',
    activeClass: 'bg-emerald-700 text-white',
    idleClass: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
  },
  {
    id: 'hidden',
    label: 'Ocultas',
    activeClass: 'bg-rose-700 text-white',
    idleClass: 'bg-rose-50 text-rose-800 hover:bg-rose-100',
  },
]

interface AlbumToolbarProps {
  readonly moderation: PostModeration
  readonly albumExport: AlbumExport
  readonly stats: AdminStats
  readonly isAdmin: boolean
}

/** Album downloads, feed reset and the filter of the moderation grid. */
export function AlbumToolbar({ moderation, albumExport, stats, isAdmin }: AlbumToolbarProps) {
  const { totalPosts, approvedPosts } = stats
  const { filter, setFilter, clearFeed } = moderation
  const { progress, downloadAlbum, exportCsv } = albumExport
  const isEmpty = totalPosts === 0
  const counts: Record<PhotoModerationFilter, number> = {
    all: totalPosts,
    approved: approvedPosts,
    hidden: totalPosts - approvedPosts,
  }

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-sage-200 space-y-3 sm:space-y-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="hidden sm:block text-sm text-sage-700 font-medium">
            Exportação &amp; Moderação de Mídias
          </p>
          <h3 className="font-serif text-lg sm:text-2xl font-bold text-sage-900 sm:mt-0.5">
            Galeria do Casamento ({approvedPosts} aprovadas)
          </h3>
        </div>

        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            disabled={progress !== null || isEmpty}
            onClick={() => void downloadAlbum()}
            className="col-span-2 min-h-11 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-xs">
            {progress ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{`Empacotando ZIP (${progress.current}/${progress.total})...`}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Baixar Álbum (.ZIP)</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isEmpty}
            onClick={exportCsv}
            title="Exportar planilha CSV com links e metadados das fotos"
            className="last:col-span-2 min-h-11 flex items-center justify-center gap-2 px-2 sm:px-4 py-2.5 rounded-2xl bg-sage-100 hover:bg-sage-200 disabled:opacity-50 text-sage-900 text-xs min-[360px]:text-sm whitespace-nowrap font-semibold transition-colors border border-sage-200/80 shadow-2xs">
            <FileSpreadsheet className="hidden min-[360px]:block shrink-0 w-4 h-4 text-emerald-700" />
            <span>Relatório (.CSV)</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => void clearFeed()}
              title="Apenas Admin: apaga todos os posts e arquivos"
              className="min-h-11 flex items-center justify-center gap-2 px-2 sm:px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs min-[360px]:text-sm whitespace-nowrap font-semibold border border-rose-200 transition-colors shadow-2xs">
              <RotateCcw className="shrink-0 w-4 h-4" />
              <span>Zerar Feed</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 pt-3 border-t border-sage-100">
        {FILTERS.map(({ id, label, activeClass, idleClass }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`min-h-11 px-0.5 sm:px-3.5 rounded-xl text-[11px] min-[360px]:text-xs sm:text-sm font-semibold transition-colors ${
              filter === id ? activeClass : idleClass
            }`}>
            {label} ({counts[id]})
          </button>
        ))}
      </div>
    </div>
  )
}
