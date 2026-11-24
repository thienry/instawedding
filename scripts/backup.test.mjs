import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import {
  compareReferences,
  describeFile,
  isMislabeled,
  keyFromUrl,
  readAll,
  resolveKey,
  saveObject,
  sniffType,
} from './backup.lib.mjs'

const KEY = 'uploads/2026/11/a.webp'
const PNG = Buffer.from('\x89PNG\r\n\x1a\n00000000', 'latin1')
let root

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'backup-test-'))
})
afterEach(() => rm(root, { recursive: true, force: true }))

it('reads past the row cap of the server', async () => {
  const table = Array.from({ length: 1203 }, (_, i) => ({ id: i + 1 }))
  // Serves fewer rows than requested, as a lower cap would
  const fetchPage = async (lastId) => table.filter(({ id }) => id > (lastId ?? 0)).slice(0, 100)
  expect(await readAll(fetchPage)).toEqual(table)
})

it('detects the real type of a file', () => {
  const type = (text) => sniffType(Buffer.from(text, 'latin1'))
  expect(sniffType(PNG)).toBe('image/png')
  expect(type('RIFF0000WEBPVP8 ')).toBe('image/webp')
  expect(type('\xff\xd8\xff\xe0')).toBe('image/jpeg')
  expect(type('\x1aE\xdf\xa3')).toBe('video/webm')
  expect(type('0000ftypisom')).toBe('video/mp4')
  expect(type('0000ftypqt  ')).toBe('video/quicktime')
  expect(type('0000ftypheic')).toBe('image/heic')
  expect(type('<html>')).toBe('unknown')
  expect(isMislabeled(KEY, 'image/png')).toBe(true)
  expect(isMislabeled(KEY, 'image/webp')).toBe(false)
})

it('finds the object of a post', () => {
  expect(keyFromUrl(`/media/${KEY}`)).toBe(KEY)
  expect(keyFromUrl(`https://pub.r2.dev/${KEY}`)).toBe(KEY)
  expect(keyFromUrl(`https://site.test/media/${KEY}?retry=1`)).toBe(KEY)
  expect(keyFromUrl('https://images.test/photo.jpg')).toBeNull()
})

it('reports missing, unused and external media', () => {
  const posts = [
    { id: 'p1', media_url: '/media/uploads/a.webp' },
    { id: 'p2', media_url: '/media/uploads/gone.webp' },
    { id: 'p3', media_url: 'https://images.test/b.jpg' },
  ]
  expect(compareReferences(posts, ['uploads/a.webp', 'uploads/old.webp'])).toEqual({
    missing: ['uploads/gone.webp'],
    unreferenced: ['uploads/old.webp'],
    externalPostIds: ['p3'],
  })
})

it('refuses keys that leave the folder', () => {
  expect(() => resolveKey(root, '../outside')).toThrow('Unsafe')
  expect(() => resolveKey(root, '/etc/passwd')).toThrow('Unsafe')
})

it('saves an object once', async () => {
  const fetchBody = vi.fn(async () => Readable.from([PNG]))
  const object = { key: KEY, size: PNG.length }
  expect(await saveObject(root, object, fetchBody)).toBe('downloaded')
  expect(await saveObject(root, object, fetchBody)).toBe('kept')
  expect(fetchBody).toHaveBeenCalledOnce()
  expect(await readFile(path.join(root, KEY))).toEqual(PNG)
  expect((await describeFile(path.join(root, KEY))).type).toBe('image/png')
})

it('leaves nothing behind when a download is cut short', async () => {
  const fetchBody = async () => Readable.from([PNG.subarray(0, 4)])
  await expect(saveObject(root, { key: KEY, size: PNG.length }, fetchBody)).rejects.toThrow('bytes')
  expect(await readdir(path.dirname(path.join(root, KEY)))).toEqual([])
})
