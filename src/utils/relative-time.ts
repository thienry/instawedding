const MINUTE_MS = 60_000
const DAY_MS = 86_400_000
/** Shown in hours even after midnight, as the party goes on past it. */
const RECENT_HOURS = 12
/** Older posts show the date. */
const MAX_DAYS = 5

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/**
 * Describes how long ago something happened, in Portuguese.
 *
 * @returns Minutes or hours today, then up to five days, then the day and month.
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const minutes = Math.floor((now.getTime() - date.getTime()) / MINUTE_MS)
  if (minutes < 1) return 'Agora mesmo'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  // Rounded, as a day may have 23 or 25 hours
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS)
  if (days < 1 || hours < RECENT_HOURS) return `há ${hours} h`
  if (days === 1) return 'há 1 dia'
  if (days <= MAX_DAYS) return `há ${days} dias`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
