type TextContext = Pick<CanvasRenderingContext2D, 'font' | 'measureText'>

const MAX_PARAGRAPHS = 6

/** Splits a word that is wider than the line. */
function splitWord(ctx: TextContext, word: string, maxWidth: number): string[] {
  const parts: string[] = []
  let part = ''
  // By code point, so emojis are not cut in half
  for (const char of word) {
    if (part && ctx.measureText(part + char).width > maxWidth) {
      parts.push(part)
      part = ''
    }
    part += char
  }
  return part ? [...parts, part] : parts
}

/** Breaks a text into lines, with the font in use, keeping its paragraphs. */
export function wrapText(ctx: TextContext, text: string, maxWidth: number): string[] {
  const paragraphs = text.split(/\n+/).filter((paragraph) => paragraph.trim())
  const kept = paragraphs.slice(0, MAX_PARAGRAPHS - 1)
  const rest = paragraphs.slice(MAX_PARAGRAPHS - 1).join(' ')

  return [...kept, rest].flatMap((paragraph) => {
    const lines: string[] = []
    let line = ''
    for (const word of paragraph.trim().split(/\s+/)) {
      const longer = line ? `${line} ${word}` : word
      if (ctx.measureText(longer).width <= maxWidth) {
        line = longer
        continue
      }
      if (line) lines.push(line)
      const parts = splitWord(ctx, word, maxWidth)
      line = parts.pop() ?? ''
      lines.push(...parts)
    }
    return line ? [...lines, line] : lines
  })
}

interface FitOptions {
  readonly maxWidth: number
  readonly maxHeight: number
  readonly minSize: number
  readonly maxSize: number
  /** Line height relative to the font size. */
  readonly leading: number
  readonly toFont: (size: number) => string
}

/** Finds the largest font size at which the text fits, and leaves it in use. */
export function fitText(
  ctx: TextContext,
  text: string,
  { maxWidth, maxHeight, minSize, maxSize, leading, toFont }: FitOptions
): { readonly lines: string[]; readonly size: number } {
  for (let size = maxSize; ; size -= 2) {
    ctx.font = toFont(size)
    const lines = wrapText(ctx, text, maxWidth)
    if (lines.length * size * leading <= maxHeight || size <= minSize) return { lines, size }
  }
}

/** Shortens a line that does not fit, with the font in use. */
export function ellipsize(ctx: TextContext, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  const chars = [...text]
  while (chars.length > 1 && ctx.measureText(`${chars.join('')}…`).width > maxWidth) chars.pop()
  return `${chars.join('').trimEnd()}…`
}
