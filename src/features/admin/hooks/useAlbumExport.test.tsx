// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { useAlbumExport } from '@/features/admin/hooks/useAlbumExport'
import { downloadBlob } from '@/utils/download'

import type { Post } from '@/types/domain'

vi.mock('@/utils/download', () => ({ downloadBlob: vi.fn() }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

const posts = ['a', 'b'].map((id): Post => ({
  id,
  authorName: id,
  mediaUrl: `/media/${id}.jpg`,
  caption: null,
  challengeId: null,
  likesCount: 0,
  isApproved: true,
  createdAt: '2026-12-12T20:00:00Z',
}))

async function download(failing: string | null) {
  vi.stubGlobal('fetch', (url: string) =>
    Promise.resolve(new Response('x', { status: url === failing ? 404 : 200 }))
  )
  const notify = vi.fn(() => Promise.resolve())
  const dialog = { notify, confirm: vi.fn(), dialog: null }
  const { result } = renderHook(() => useAlbumExport(posts, dialog))
  await act(() => result.current.downloadAlbum())
  expect(downloadBlob).toHaveBeenCalledOnce()
  return notify
}

it('reports the files missing from the album', async () => {
  const notify = await download('/media/b.jpg')
  expect(notify).toHaveBeenCalledWith(expect.stringContaining('1 de 2 arquivos'))
})

it('reports nothing when the album is complete', async () => {
  expect(await download(null)).not.toHaveBeenCalled()
})
