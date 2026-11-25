import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Fills the browser APIs that jsdom does not implement.
export function setupBrowser(): void {
  // The default second is too short on a busy machine
  configure({ asyncUtilTimeout: 5000 })
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    URL.createObjectURL = () => 'blob:test'
    URL.revokeObjectURL = () => {}
    window.scrollTo = () => {}
    Element.prototype.scrollIntoView = () => {}
    HTMLMediaElement.prototype.play = () => Promise.resolve()
    HTMLMediaElement.prototype.pause = () => {}
  })
  afterEach(cleanup)
}
