import { expect, it } from 'vitest'

import { canvasToFile, toImageFile } from '@/utils/canvas-file'

/** Canvas of a browser that only writes the given types. */
const canvasThatWrites = (...types: string[]) =>
  ({
    toBlob: (done: (blob: Blob | null) => void, type: string) =>
      done(new Blob(['x'], { type: types.includes(type) ? type : 'image/png' })),
  }) as unknown as HTMLCanvasElement

it('uses WebP when the browser writes it', async () => {
  const file = await canvasToFile(canvasThatWrites('image/webp', 'image/jpeg'), 'a', 0.8)
  expect([file.name, file.type]).toEqual(['a.webp', 'image/webp'])
})

it('uses JPEG instead of a PNG disguised as WebP', async () => {
  const file = await canvasToFile(canvasThatWrites('image/jpeg'), 'a', 0.8)
  expect([file.name, file.type]).toEqual(['a.jpg', 'image/jpeg'])
})

it('names a file after its content', () => {
  expect(toImageFile(new Blob([], { type: 'image/png' }), 'a').name).toBe('a.png')
})
