import { describe, expect, it } from 'vitest'

import { getMediaExtension } from '@/utils/media-extension'

describe('getMediaExtension', () => {
  it.each([
    ['/media/uploads/2026/12/a.jpg', 'jpg'],
    ['/media/uploads/2026/12/a.MOV', 'mov'],
    ['/media/uploads/2026/12/a.webm?v=1', 'webm'],
    ['https://example.com/photo', 'webp'],
    ['data:video/mp4;base64,AAAA', 'mp4'],
  ])('of %s is %s', (mediaUrl, extension) => {
    expect(getMediaExtension({ mediaUrl })).toBe(extension)
  })
})
