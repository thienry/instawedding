import { expect, it } from 'vitest'

import { applyColorFilter } from '@/utils/color-filter'

function filter(css: string, rgb: readonly number[]) {
  const pixels = new Uint8ClampedArray([...rgb, 200])
  applyColorFilter(pixels, css)
  return [...pixels]
}

it('turns a photo black and white', () => {
  const [r, g, b, alpha] = filter('grayscale(1)', [255, 0, 0])
  expect([r, g, b]).toEqual([54, 54, 54])
  expect(alpha).toBe(200)
})

it('follows the CSS definitions', () => {
  expect(filter('none', [10, 20, 30])).toEqual([10, 20, 30, 200])
  expect(filter('brightness(0.5)', [100, 50, 200])).toEqual([50, 25, 100, 200])
  expect(filter('contrast(2)', [127.5, 0, 255])).toEqual([128, 0, 255, 200])
  expect(filter('saturate(0)', [0, 255, 0])).toEqual([182, 182, 182, 200])
  expect(filter('sepia(1)', [100, 100, 100])).toEqual([135, 120, 94, 200])
})

it('applies the steps in order', () => {
  expect(filter('brightness(2) grayscale(1)', [200, 0, 0])).toEqual([54, 54, 54, 200])
})
