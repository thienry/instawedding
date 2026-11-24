import { Share2 } from 'lucide-react'

interface ShareToastProps {
  readonly message: string | null
}

/** Brief confirmation that the link was copied. */
export function ShareToast({ message }: ShareToastProps) {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-sage-900 text-white text-xs sm:text-sm font-semibold shadow-lg border border-white/15 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <Share2 className="w-4 h-4 text-gold-400" />
      <span>{message}</span>
    </div>
  )
}
