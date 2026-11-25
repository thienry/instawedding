import { Camera } from 'lucide-react'
import { Link } from 'react-router-dom'

interface EmptyFeedProps {
  /** Whether posts exist outside the current filter. */
  readonly hasPosts: boolean
  readonly challengeId: number | null
}

/** Invitation to post when there is nothing to show. */
export function EmptyFeed({ hasPosts, challengeId }: EmptyFeedProps) {
  return (
    <div className="bg-white rounded-3xl p-10 border border-sage-200 text-center space-y-4 shadow-xs">
      <span className="text-4xl block">📷</span>
      <h3 className="font-serif text-xl font-bold text-sage-900">
        {hasPosts ? 'Nenhum post encontrado neste filtro' : 'Nenhum post ainda'}
      </h3>
      <p className="text-sm text-sage-700 max-w-md mx-auto leading-relaxed">
        {hasPosts
          ? 'Experimente trocar a aba acima ou faça um novo post agora.'
          : 'Seja o primeiro a registrar e compartilhar um momento especial da festa de Thiago & Priscila!'}
      </p>
      <Link
        to={challengeId !== null ? `/capture?challengeId=${challengeId}` : '/capture'}
        className="inline-flex items-center gap-2 mt-2 px-6 py-3 rounded-full bg-sage-900 text-white text-sm font-semibold hover:bg-sage-800 transition-colors shadow-sm">
        <Camera className="w-4 h-4" />
        <span>Fazer Novo Post</span>
      </Link>
    </div>
  )
}
