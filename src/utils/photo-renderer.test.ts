import { beforeEach, expect, it, vi } from 'vitest'

import { renderFilteredAndFramedPhoto } from '@/utils/photo-renderer'

import type { PhotoFrameId } from '@/utils/photo-filters'

vi.mock('@/utils/blur-placeholder', () => ({
  getAdaptiveNetworkProfile: () => ({ maxWidthOrHeight: 1000, quality: 0.8 }),
}))

let log: string[] = []
let photo = { naturalWidth: 2000, naturalHeight: 1000 }
let canvas: Record<string, unknown> = {}
let blob: Blob | null = null

// Records everything drawn, with the styles in use.
function createContext() {
  const styles: Record<string, unknown> = {}
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      log.push(`${name}(${args.map(String)}) ${JSON.stringify(styles)}`)
    }
  return new Proxy(styles, {
    get: (_, name: string) => {
      if (name === 'createLinearGradient') {
        return (...args: unknown[]) => {
          record(name)(...args)
          return { addColorStop: record('addColorStop') }
        }
      }
      return record(name)
    },
  })
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 0, 2) })
  log = []
  photo = { naturalWidth: 2000, naturalHeight: 1000 }
  blob = new Blob(['x'])
  vi.stubGlobal(
    'Image',
    class {
      onload = () => {}
      onerror = (_error: string) => {}
      get naturalWidth() {
        return photo.naturalWidth
      }
      get naturalHeight() {
        return photo.naturalHeight
      }
      set src(value: string) {
        queueMicrotask(() => (value === 'broken' ? this.onerror('x') : this.onload()))
      }
      toString() {
        return 'photo'
      }
    }
  )
  canvas = {
    getContext: createContext,
    toBlob: (done: (blob: Blob | null) => void) => done(blob),
  }
  vi.stubGlobal('document', { createElement: () => canvas })
})

const render = (frameId: PhotoFrameId, source = 'blob:x') =>
  renderFilteredAndFramedPhoto(source, 'foto.final.jpg', {
    filterId: 'bw',
    frameId,
  })

it.each([
  ['none', 1000, 500],
  ['cinema', 1000, 500],
  ['golden-border', 1000, 500],
  ['minimal-floral', 1000, 500],
  ['polaroid', 1100, 770],
] as const)('draws the %s frame', async (frameId, width, height) => {
  const file = await render(frameId)
  expect([canvas.width, canvas.height]).toEqual([width, height])
  expect([file.name, file.type]).toEqual(['foto.final-filtered.webp', 'image/webp'])
  expect(log).toMatchSnapshot()
})

it('scales tall photos and keeps small ones', async () => {
  photo = { naturalWidth: 1000, naturalHeight: 4000 }
  await render('none')
  expect([canvas.width, canvas.height]).toEqual([250, 1000])
  photo = { naturalWidth: 300, naturalHeight: 200 }
  await render('none')
  expect([canvas.width, canvas.height]).toEqual([300, 200])
})

it('reports what it cannot render', async () => {
  await expect(render('none', 'broken')).rejects.toThrow('Failed to load image')
  blob = null
  await expect(render('none')).rejects.toThrow('Failed to generate image')
  canvas.getContext = () => null
  await expect(render('none')).rejects.toThrow('Canvas 2D context')
})
