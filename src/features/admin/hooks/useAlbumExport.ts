import { useState } from 'react'

import {
  albumEntryName,
  buildPostsCsv,
  datedFileName,
  downloadBlob,
} from '@/features/admin/utils/album-export'
import { buildZipArchive } from '@/utils/zip-exporter'

import type { Dialog } from '@/hooks/useDialog'
import type { Post } from '@/types/domain'
import type { ZipEntry } from '@/utils/zip-exporter'

/** How many media files have been processed so far. */
interface ExportProgress {
  readonly current: number
  readonly total: number
}

/** Album downloads, as returned by {@link useAlbumExport}. */
export interface AlbumExport {
  /** Progress of the ZIP in preparation, or `null` when idle. */
  readonly progress: ExportProgress | null
  /** Downloads the approved media as a ZIP, skipping files that fail. */
  readonly downloadAlbum: () => Promise<void>
  /** Downloads a CSV report of every post. */
  readonly exportCsv: () => void
}

/** Byte order mark that makes Excel read the CSV as UTF-8. */
const UTF8_BOM = '﻿'

async function fetchZipEntry(
  post: Post,
  index: number
): Promise<ZipEntry | null> {
  try {
    const response = await fetch(post.mediaUrl)
    if (!response.ok) return null
    return {
      filename: albumEntryName(post, index),
      data: new Uint8Array(await response.arrayBuffer()),
      date: new Date(post.createdAt),
    }
  } catch {
    return null
  }
}

/**
 * Exports the album as ZIP or CSV.
 *
 * @param posts - Every post of the event.
 * @param dialog - Dialogs used to report failures.
 */
export function useAlbumExport(
  posts: readonly Post[],
  { notify }: Dialog
): AlbumExport {
  const [progress, setProgress] = useState<ExportProgress | null>(null)

  const downloadAlbum = async () => {
    const approvedPosts = posts.filter((post) => post.isApproved)
    const total = approvedPosts.length
    if (total === 0) {
      void notify('Não há fotos aprovadas para baixar.')
      return
    }

    try {
      const entries: ZipEntry[] = []
      // Sequential on purpose: one download at a time, with ordered progress
      for (const [index, post] of approvedPosts.entries()) {
        setProgress({ current: index + 1, total })
        const entry = await fetchZipEntry(post, index)
        if (entry) entries.push(entry)
      }

      if (entries.length === 0) {
        void notify(
          'Não foi possível carregar as mídias para gerar o arquivo ZIP.'
        )
        return
      }

      downloadBlob(
        buildZipArchive(entries),
        datedFileName('album-casamento', 'zip')
      )
    } catch {
      void notify('Ocorreu um erro ao empacotar o álbum em ZIP.')
    } finally {
      setProgress(null)
    }
  }

  const exportCsv = () => {
    const blob = new Blob([UTF8_BOM + buildPostsCsv(posts)], {
      type: 'text/csv;charset=utf-8',
    })
    downloadBlob(blob, datedFileName('relatorio-fotos', 'csv'))
  }

  return { progress, downloadAlbum, exportCsv }
}
