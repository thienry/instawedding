import { lazy } from 'react'

import type { ComponentType, LazyExoticComponent } from 'react'

const RELOADED_AT_KEY = 'instawedding_chunk_reload_at'
const RELOAD_INTERVAL_MS = 60_000

/** Page downloaded on demand, as returned by {@link lazyPage}. */
interface LazyPage {
  readonly Page: LazyExoticComponent<ComponentType>
  /** Downloads the page in advance. Ignores failures. */
  readonly preload: () => void
}

/** Reloads to get the files of a new version, at most once a minute. */
function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT_KEY))
    if (!navigator.onLine || Date.now() - last < RELOAD_INTERVAL_MS) return false
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

/** Declares a page in a file of its own, which a deployment may remove. */
export function lazyPage(load: () => Promise<ComponentType>): LazyPage {
  return {
    Page: lazy(async () => {
      try {
        return { default: await load() }
      } catch (error) {
        // Waits for the reload instead of flashing the error screen
        if (reloadOnce()) return new Promise<never>(() => {})
        throw error
      }
    }),
    preload: () => void load().catch(() => {}),
  }
}
