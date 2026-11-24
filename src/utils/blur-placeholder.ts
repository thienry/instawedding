export type NetworkTier = 'low' | 'medium' | 'high'

export interface AdaptiveNetworkProfile {
  readonly tier: NetworkTier
  readonly maxSizeMB: number
  readonly maxWidthOrHeight: number
  readonly quality: number
}

interface NavigatorConnection {
  readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
  readonly saveData?: boolean
  readonly downlink?: number
}

interface NavigatorWithConnection extends Navigator {
  readonly connection?: NavigatorConnection
  readonly mozConnection?: NavigatorConnection
  readonly webkitConnection?: NavigatorConnection
}

/**
 * Inspects the browser Network Information API to adapt image resolution and
 * WebP encoding quality to the current mobile network conditions (2G/3G/4G/Data Saver).
 */
export function getAdaptiveNetworkProfile(): AdaptiveNetworkProfile {
  if (typeof navigator === 'undefined') {
    return {
      tier: 'high',
      maxSizeMB: 0.65,
      maxWidthOrHeight: 1280,
      quality: 0.82,
    }
  }

  const nav = navigator as NavigatorWithConnection
  const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection

  if (!conn) {
    return {
      tier: 'high',
      maxSizeMB: 0.65,
      maxWidthOrHeight: 1280,
      quality: 0.82,
    }
  }

  if (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
    return {
      tier: 'low',
      maxSizeMB: 0.28,
      maxWidthOrHeight: 960,
      quality: 0.72,
    }
  }

  if (
    conn.effectiveType === '3g' ||
    (typeof conn.downlink === 'number' && conn.downlink > 0 && conn.downlink < 1.5)
  ) {
    return {
      tier: 'medium',
      maxSizeMB: 0.42,
      maxWidthOrHeight: 1080,
      quality: 0.78,
    }
  }

  return {
    tier: 'high',
    maxSizeMB: 0.65,
    maxWidthOrHeight: 1280,
    quality: 0.82,
  }
}

const LQIP_STORAGE_KEY = 'instawedding_lqip_cache_v1'
const memoryLqipCache = new Map<string, string>()

function loadSessionLqipMap(): Record<string, string> {
  if (typeof sessionStorage === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(LQIP_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/**
 * Caches a tiny Blur-Up placeholder data URL in memory and sessionStorage
 * keyed by media URL or post ID for instant 0ms rendering on mobile networks.
 */
export function cacheBlurPlaceholder(mediaKey: string, blurDataUrl: string): void {
  if (!mediaKey || !blurDataUrl) return
  memoryLqipCache.set(mediaKey, blurDataUrl)
  if (typeof sessionStorage === 'undefined') return
  try {
    const map = loadSessionLqipMap()
    const keys = Object.keys(map)
    if (keys.length > 120) {
      const oldestKey = keys[0]
      if (oldestKey) {
        delete map[oldestKey]
      }
    }
    map[mediaKey] = blurDataUrl
    sessionStorage.setItem(LQIP_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Ignore storage quota errors for optional LQIP cache
  }
}

/**
 * Retrieves a cached Blur-Up placeholder data URL by media URL or post ID.
 */
export function getCachedBlurPlaceholder(mediaKey: string): string | null {
  const fromMem = memoryLqipCache.get(mediaKey)
  if (fromMem) return fromMem
  const map = loadSessionLqipMap()
  const found = map[mediaKey] ?? null
  if (found) {
    memoryLqipCache.set(mediaKey, found)
  }
  return found
}

/**
 * Generates an ultra-small (~250-350 bytes) 24px WebP data URL for Instagram-style
 * Blur-Up placeholders in ~3ms using Canvas.
 */
export async function generateBlurPlaceholder(fileOrBlob: Blob): Promise<string> {
  if (typeof document === 'undefined') return ''
  const objectUrl = URL.createObjectURL(fileOrBlob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = (err) => reject(err)
      element.src = objectUrl
    })

    const maxTiny = 24
    const naturalW = img.naturalWidth || img.width || 24
    const naturalH = img.naturalHeight || img.height || 24
    const ratio = naturalW / naturalH
    const targetW = ratio >= 1 ? maxTiny : Math.max(8, Math.round(maxTiny * ratio))
    const targetH = ratio >= 1 ? Math.max(8, Math.round(maxTiny / ratio)) : maxTiny

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.drawImage(img, 0, 0, targetW, targetH)
    return canvas.toDataURL('image/webp', 0.45)
  } catch {
    return ''
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
