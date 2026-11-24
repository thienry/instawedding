import { resolvePostMediaType } from '@/utils/video'

import type { Post } from '@/types/domain'

const CSV_HEADERS = [
  'ID',
  'Autor',
  'Tipo',
  'Curtidas',
  'Desafio',
  'Legenda',
  'Data',
  'Status',
  'URL',
]

/** Start of a text that spreadsheets may run as a formula. */
const FORMULA_START = /^\s*[=+\-@]|^[\t\r\n]/

/**
 * Encodes a guest-controlled text as a CSV cell.
 *
 * Quotes are doubled, and a leading apostrophe keeps formulas as plain text.
 */
function toCsvCell(text: string | null | undefined): string {
  const value = text ?? ''
  const safeValue = FORMULA_START.test(value) ? `'${value}` : value
  return `"${safeValue.replaceAll('"', '""')}"`
}

/** Turns a name into a lowercase ASCII slug; empty when nothing is left. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Names a media file inside the album ZIP.
 *
 * @param post - Post that owns the media.
 * @param index - Zero-based position among the approved posts.
 * @returns A name such as `foto-001-ana-maria.webp`.
 */
export function albumEntryName(post: Post, index: number): string {
  const position = String(index + 1).padStart(3, '0')
  const author = slugify(post.authorName) || 'convidado'
  const extension = resolvePostMediaType(post) === 'video' ? 'mp4' : 'webp'
  return `foto-${position}-${author}.${extension}`
}

/**
 * Builds the posts report.
 *
 * @returns Semicolon-separated rows with a header, as Excel expects in pt-BR.
 */
export function buildPostsCsv(posts: readonly Post[]): string {
  const rows = posts.map((post) => [
    post.id,
    toCsvCell(post.authorName),
    resolvePostMediaType(post),
    post.likesCount,
    toCsvCell(post.challenge?.title),
    toCsvCell(post.caption),
    new Date(post.createdAt).toLocaleString('pt-BR'),
    post.isApproved ? 'Aprovado' : 'Oculto',
    toCsvCell(post.mediaUrl),
  ])
  return [CSV_HEADERS, ...rows].map((row) => row.join(';')).join('\r\n')
}

/**
 * Names a download after the couple and the current UTC date.
 *
 * @param prefix - What the file contains.
 * @param extension - File extension, without the dot.
 */
export function datedFileName(prefix: string, extension: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${prefix}-thiago-e-priscila-${date}.${extension}`
}

/** Makes the browser download a blob as `fileName`. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
