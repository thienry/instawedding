import crypto from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, open, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

/** Tables in the backup. `rate_limits` is left out: it is disposable. */
export const TABLES = ['challenges', 'posts', 'likes', 'ceremonialists']

const PAGE_SIZE = 500

/**
 * Reads a whole table. Pages by id, since the server caps each response and
 * offsets would skip rows deleted meanwhile.
 *
 * @param fetchPage - Returns the rows after an id, in id order.
 */
export async function readAll(fetchPage) {
  const rows = []
  let lastId = null
  for (;;) {
    const page = await fetchPage(lastId, PAGE_SIZE)
    if (page.length === 0) return rows
    rows.push(...page)
    lastId = page.at(-1).id
  }
}

/** Detects the real type of a file by its first bytes. */
export function sniffType(head) {
  const ascii = (start, end) => head.subarray(start, end).toString('latin1')
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg'
  if (ascii(0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (ascii(0, 4) === '\x1aE\xdf\xa3') return 'video/webm'
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12)
    if (brand === 'qt  ') return 'video/quicktime'
    return /^(hei|hev|mif|msf)/.test(brand) ? 'image/heic' : 'video/mp4'
  }
  return 'unknown'
}

const TYPE_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
}

/** Whether the bytes of a file contradict its extension. */
export function isMislabeled(key, realType) {
  return TYPE_BY_EXTENSION[path.extname(key).toLowerCase()] !== realType
}

/** Local path of an object. Throws if its key would leave the folder. */
export function resolveKey(root, key) {
  const target = path.resolve(root, key)
  if (!target.startsWith(path.resolve(root) + path.sep)) {
    throw new Error(`Unsafe object key: ${key}`)
  }
  return target
}

/** Object key that a post points to, or `null` for media stored elsewhere. */
export function keyFromUrl(url) {
  return /^(?:https:\/\/[^/]+)?(?:\/media)?\/(uploads\/[^?#]+)/.exec(url)?.[1] ?? null
}

/** Compares what the posts use with what is stored. */
export function compareReferences(posts, storedKeys) {
  const stored = new Set(storedKeys)
  const used = new Set()
  const external = []
  for (const { id, media_url: url } of posts) {
    const key = keyFromUrl(url)
    if (key) used.add(key)
    else external.push(id)
  }
  return {
    missing: [...used].filter((key) => !stored.has(key)),
    unreferenced: [...stored].filter((key) => !used.has(key)),
    externalPostIds: external,
  }
}

async function fileSize(file) {
  const info = await stat(file).catch((error) => {
    if (error.code === 'ENOENT') return null
    throw error
  })
  return info?.size ?? null
}

/**
 * Saves an object, unless a previous run already did: keys are never reused.
 * The final name only appears once the size is right.
 *
 * @param object - `key` and `size` from the bucket listing.
 * @param fetchBody - Returns the content as a stream.
 */
export async function saveObject(root, { key, size }, fetchBody) {
  const target = resolveKey(root, key)
  if ((await fileSize(target)) === size) return 'kept'

  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 })
  const partial = `${target}.part`
  try {
    const handle = await open(partial, 'w', 0o600)
    await pipeline(await fetchBody(key), handle.createWriteStream())
    const received = await fileSize(partial)
    if (received !== size) throw new Error(`${key}: expected ${size} bytes, got ${received}`)
    await rename(partial, target)
  } finally {
    await rm(partial, { force: true })
  }
  return 'downloaded'
}

/** Hash and real type of a saved file. */
export async function describeFile(file) {
  const hash = crypto.createHash('sha256')
  let head = Buffer.alloc(0)
  for await (const chunk of createReadStream(file)) {
    if (head.length < 16) head = Buffer.concat([head, chunk.subarray(0, 16)])
    hash.update(chunk)
  }
  return { sha256: hash.digest('hex'), type: sniffType(head) }
}

export async function writeJson(file, data) {
  await writeFile(file, JSON.stringify(data, null, 2), { mode: 0o600, flag: 'wx' })
}
