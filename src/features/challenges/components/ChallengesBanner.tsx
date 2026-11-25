import { Sparkles, Trophy } from 'lucide-react'

interface ChallengesBannerProps {
  readonly completedCount: number
  readonly totalChallenges: number
}

/** Page title with the progress of the guest. */
export function ChallengesBanner({ completedCount, totalChallenges }: ChallengesBannerProps) {
  const progressPct = totalChallenges > 0 ? Math.round((completedCount / totalChallenges) * 100) : 0

  return (
    <div className="bg-gradient-to-br from-sage-900 to-sage-800 text-white rounded-3xl p-4 sm:p-8 shadow-md space-y-3 sm:space-y-4 relative overflow-hidden">
      <div className="absolute top-3 right-4 opacity-10 pointer-events-none">
        <Trophy className="w-32 h-32" />
      </div>
      <div className="space-y-1 sm:space-y-2 max-w-2xl">
        <div className="hidden sm:flex items-center gap-2 text-gold-400 text-xs sm:text-sm font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Caça ao Tesouro Fotográfico</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
          Desafios da Festa
        </h2>
        <p className="text-sm sm:text-base text-white/85 leading-relaxed">
          Encontre e registre cada momento especial abaixo para animar o telão de Thiago &amp;
          Priscila!
        </p>
      </div>

      {/* Personal Progress Bar */}
      {totalChallenges > 0 && (
        <div className="pt-2.5 sm:pt-3 space-y-2 border-t border-white/15 max-w-xl">
          <div className="flex items-center justify-between gap-2 whitespace-nowrap text-xs sm:text-sm">
            <span className="font-semibold text-white/90">
              Seu Progresso<span className="hidden sm:inline"> na Festa</span>
            </span>
            <span className="font-bold text-gold-400">
              {completedCount} de {totalChallenges} concluídos ({progressPct}%)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-gold-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
