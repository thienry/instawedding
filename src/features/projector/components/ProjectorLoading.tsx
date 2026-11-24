import { Loader2 } from 'lucide-react'

/** Shown while the session is verified. */
export function ProjectorLoading() {
  return (
    <div className="projector-ground h-dvh w-full flex flex-col items-center justify-center p-6 gap-4">
      <Loader2 className="w-7 h-7 animate-spin text-gold-400" />
      <p className="text-sm text-white/60">Verificando credenciais de acesso ao Telão...</p>
    </div>
  )
}
