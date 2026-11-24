import { describe, expect, it } from 'vitest'

import {
  isVideoFile,
  isVideoUrl,
  normalizeMimeType,
  normalizeVideoFile,
  resolvePostMediaType,
} from '@/utils/video'

it('normalizes MIME types', () => {
  expect(normalizeMimeType(' Video/WebM;codecs=vp9 ')).toBe('video/webm')
})

it('detects video files by MIME type or extension', () => {
  expect(isVideoFile(new Blob([], { type: 'video/mp4' }))).toBe(true)
  expect(isVideoFile(new File([], 'CLIP.MOV'))).toBe(true)
  expect(isVideoFile(new File([], 'a.webp', { type: 'image/webp' }))).toBe(false)
})

it.each([
  ['https://x.test/a.mp4?v=1#t', true],
  ['data:video/webm;base64,AA', true],
  ['https://x.test/a.webp?f=.mp4', false],
  ['', false],
])('isVideoUrl(%j) is %s', (url, expected) => {
  expect(isVideoUrl(url)).toBe(expected)
})

it('prefers the explicit media type over the URL', () => {
  expect(resolvePostMediaType({ mediaUrl: 'a.mp4', mediaType: 'image' })).toBe('image')
  expect(resolvePostMediaType({ mediaUrl: 'a.mp4' })).toBe('video')
})

describe('normalizeVideoFile', () => {
  it('fixes the type and extension', () => {
    const file = normalizeVideoFile(
      new File(['x'], 'clip.webm', { type: 'video/quicktime;codecs=a' })
    )
    expect([file.name, file.type]).toEqual(['clip.mov', 'video/quicktime'])
  })

  it('returns an already normalized file untouched', () => {
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' })
    expect(normalizeVideoFile(file)).toBe(file)
  })
})
