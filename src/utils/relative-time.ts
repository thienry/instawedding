const MINUTE_MS = 60_000

/**
 * Describes how long ago something happened, in Portuguese.
 *
 * @returns Minutes or hours within a day; the day and month after that.
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const minutes = Math.floor((Date.now() - date.getTime()) / MINUTE_MS)
  if (minutes < 1) return 'Agora mesmo'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
