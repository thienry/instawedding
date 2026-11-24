import { ShieldCheck } from 'lucide-react'

interface FeedFooterProps {
  readonly onOpenTerms: () => void
}

/** Terms link and credits. */
export function FeedFooter({ onOpenTerms }: FeedFooterProps) {
  return (
    <footer className="pt-8 pb-4 text-center space-y-2 border-t border-sage-200/60">
      <button
        type="button"
        onClick={onOpenTerms}
        className="inline-flex items-center gap-2 text-xs sm:text-sm text-sage-800/75 hover:text-sage-900 font-medium underline underline-offset-4 transition-colors"
      >
        <ShieldCheck className="w-4 h-4 text-sage-800" />
        <span>Termos de Uso &amp; Privacidade (LGPD)</span>
      </button>
      <p className="text-xs text-sage-800/55">
        InstaWedding • Thiago &amp; Priscila © 2026
      </p>
    </footer>
  )
}
