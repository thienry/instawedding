import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'

import { QrCodeSvg } from '@/components/common/QrCodeSvg'

// Reads the drawing back, one row of modules at a time.
function draw(value: string) {
  const svg = renderToStaticMarkup(<QrCodeSvg value={value} />)
  const size = Number(/viewBox="0 0 (\d+)/.exec(svg)?.[1]) - 4
  const dark = new Set(
    [...svg.matchAll(/x="(\d+)" y="(\d+)" width="1"/g)].map(
      ([, x, y]) => `${Number(x) - 2},${Number(y) - 2}`
    )
  )
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => (dark.has(`${x},${y}`) ? '#' : '.')).join('')
  )
}

it('draws the three finder patterns', () => {
  const rows = draw('https://x.test')
  const finder = ['#######', '#.....#', '#.###.#', '#.###.#', '#.###.#', '#.....#', '#######']
  expect(rows.slice(0, 7).map((row) => row.slice(0, 7))).toEqual(finder)
  expect(rows.slice(0, 7).map((row) => row.slice(-7))).toEqual(finder)
  expect(rows.slice(-7).map((row) => row.slice(0, 7))).toEqual(finder)
})

it.each([
  [17, 21],
  [18, 25],
  [32, 25],
  [33, 29],
  [53, 29],
  [78, 33],
  [106, 37],
  [134, 41],
])('fits %i bytes in %i modules', (length, size) => {
  expect(draw('a'.repeat(length))).toHaveLength(size)
})

it.each([17, 78, 134, 150])('keeps drawing the same %i-byte code', (length) => {
  const value = 'https://x.test/?a='.repeat(9).slice(0, length)
  expect(`\n${draw(value).join('\n')}\n`).toMatchSnapshot()
})
