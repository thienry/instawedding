import { Camera, Heart, Sparkles, Trophy } from 'lucide-react'

import type { AdminStats } from '@/features/admin/utils/admin-stats'
import type { ReactNode } from 'react'

interface MetricCardProps {
  readonly title: string
  readonly titleClass: string
  readonly icon: ReactNode
  readonly iconClass: string
  readonly children: ReactNode
}

function MetricCard({
  title,
  titleClass,
  icon,
  iconClass,
  children,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-sage-200/80 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-bold uppercase tracking-wider ${titleClass}`}
        >
          {title}
        </span>
        <span className={`p-2 rounded-xl ${iconClass}`}>{icon}</span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

interface MetricValueProps {
  readonly value: number
  readonly unit: string
}

function MetricValue({ value, unit }: MetricValueProps) {
  return (
    <h4 className="font-serif text-3xl font-bold text-sage-900 leading-none">
      {value}{' '}
      <span className="text-sm font-sans font-semibold text-sage-800">
        {unit}
      </span>
    </h4>
  )
}

interface MetricsCardsProps {
  readonly stats: AdminStats
}

/** Summary of the event in four cards. */
export function MetricsCards({ stats }: MetricsCardsProps) {
  const { topLikedPost, topAuthor } = stats

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <MetricCard
        title="Mídias do Evento"
        titleClass="text-sage-800"
        icon={<Camera className="w-4 h-4" />}
        iconClass="bg-sage-100 text-sage-800"
      >
        <h4 className="font-serif text-3xl font-bold text-sage-900 leading-none">
          {stats.totalPosts}
        </h4>
        <p className="text-xs text-sage-800/80 font-medium mt-1.5">
          {stats.totalPhotos} fotos • {stats.totalVideos} vídeos (
          {stats.approvedPosts} aprovadas)
        </p>
      </MetricCard>

      <MetricCard
        title="Mais Curtida"
        titleClass="text-rose-600"
        icon={<Heart className="w-4 h-4 fill-rose-500 text-rose-500" />}
        iconClass="bg-rose-50 text-rose-600"
      >
        <MetricValue value={topLikedPost?.likesCount ?? 0} unit="likes" />
        <p className="text-xs text-sage-800/80 font-medium mt-1.5 truncate">
          Por {topLikedPost?.authorName ?? 'Nenhum voto ainda'}
        </p>
      </MetricCard>

      <MetricCard
        title="Fotógrafo da Noite"
        titleClass="text-gold-500"
        icon={<Trophy className="w-4 h-4 text-gold-500" />}
        iconClass="bg-gold-400/20 text-gold-500"
      >
        <h4 className="font-serif text-xl sm:text-2xl font-bold text-sage-900 leading-tight truncate">
          {topAuthor?.name ?? 'Nenhum ainda'}
        </h4>
        <p className="text-xs text-sage-800/80 font-medium mt-1.5">
          {topAuthor?.postCount ?? 0} fotos enviadas
        </p>
      </MetricCard>

      <MetricCard
        title="Gincana da Festa"
        titleClass="text-emerald-600"
        icon={<Sparkles className="w-4 h-4 text-emerald-600" />}
        iconClass="bg-emerald-50 text-emerald-700"
      >
        <MetricValue value={stats.challengePosts} unit="desafios" />
        <p className="text-xs text-sage-800/80 font-medium mt-1.5">
          {stats.challengeRate}% de participação dos convidados
        </p>
      </MetricCard>
    </div>
  )
}
