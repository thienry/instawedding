import { WifiOff } from 'lucide-react'

/** Tells the guest that uploads wait for the connection. */
export function OfflineBanner() {
  return (
    <div className="bg-amber-600 text-white text-xs sm:text-sm font-medium px-4 py-2.5 flex items-center justify-center gap-2 shadow-xs">
      <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
      <span>Você está offline. Suas fotos serão enviadas assim que a conexão voltar.</span>
    </div>
  )
}
