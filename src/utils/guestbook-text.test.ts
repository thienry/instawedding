import { expect, it } from 'vitest'

import { ellipsize, fitText, wrapText } from '@/utils/guestbook-text'

// Every character is half as wide as the font is tall
const ctx = {
  font: '20px x',
  measureText(text: string) {
    return { width: ([...text].length * parseInt(this.font)) / 2 } as TextMetrics
  },
}

it('wraps words and splits the ones that do not fit', () => {
  ctx.font = '20px x'
  expect(wrapText(ctx, 'um dois tres', 80)).toEqual(['um dois', 'tres'])
  expect(wrapText(ctx, 'oi kkkkkkkkkkkk', 50)).toEqual(['oi', 'kkkkk', 'kkkkk', 'kk'])
  expect(wrapText(ctx, '💍💍💍', 20)).toEqual(['💍💍', '💍'])
})

it('keeps paragraphs, within a limit', () => {
  ctx.font = '20px x'
  expect(wrapText(ctx, 'a\n\n\nb', 80)).toEqual(['a', 'b'])
  expect(wrapText(ctx, 'a\n'.repeat(100), 10_000)).toHaveLength(6)
})

it('never goes past the area of the card', () => {
  for (const text of ['Viva!', 'amor '.repeat(64), 'k'.repeat(320), 'a\n'.repeat(160)]) {
    const { lines, size } = fitText(ctx, text, {
      maxWidth: 760,
      maxHeight: 610,
      minSize: 34,
      maxSize: 84,
      leading: 1.36,
      toFont: (fontSize) => `${fontSize}px x`,
    })
    expect(lines.length * size * 1.36).toBeLessThanOrEqual(610)
    for (const line of lines) expect(ctx.measureText(line).width).toBeLessThanOrEqual(760)
  }
})

it('shortens a long signature', () => {
  ctx.font = '20px x'
  expect(ellipsize(ctx, 'Ana', 100)).toBe('Ana')
  expect(ellipsize(ctx, 'Maria Fernanda', 60)).toBe('Maria…')
})
