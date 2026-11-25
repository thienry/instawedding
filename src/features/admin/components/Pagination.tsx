import { ChevronLeft, ChevronRight } from 'lucide-react'

const BUTTON_CLASS =
  'min-h-11 px-3.5 flex items-center gap-1 rounded-xl text-sm font-semibold bg-sage-100 hover:bg-sage-200 disabled:opacity-50 text-sage-900 transition-colors'

interface PaginationProps {
  /** Current page, starting at 1. */
  readonly page: number
  readonly pageCount: number
  readonly onChange: (page: number) => void
}

/** Previous and next buttons around the current page number. */
export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-2">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className={BUTTON_CLASS}>
        <ChevronLeft className="w-4 h-4" />
        Anterior
      </button>
      <span aria-live="polite" className="text-sm text-sage-700">
        Página {page} de {pageCount}
      </span>
      <button
        type="button"
        disabled={page === pageCount}
        onClick={() => onChange(page + 1)}
        className={BUTTON_CLASS}>
        Próxima
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  )
}
