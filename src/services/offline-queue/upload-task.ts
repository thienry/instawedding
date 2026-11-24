import { generateBlurPlaceholder } from '@/utils/blur-placeholder'
import { generateUUID } from '@/utils/uuid'
import { extractVideoPoster, isVideoFile } from '@/utils/video'

import type { Challenge, PostMediaType } from '@/types/domain'

type UploadTaskStatus = 'uploading' | 'queued-offline' | 'failed'

/** Data of an upload that survives a reload. */
interface UploadDetails {
  readonly id: string
  readonly authorName: string
  readonly authorAvatarUrl?: string | null
  readonly caption: string | null
  readonly challengeId: number | null
  readonly challenge?: Challenge
  readonly clientSessionId: string
  readonly blurDataUrl?: string
  readonly status: UploadTaskStatus
  readonly errorMessage?: string
  /** Only the guest may retry. Set with the status `failed`. */
  readonly isPermanentFailure?: boolean
  readonly showOnProjector?: boolean
  readonly createdAt: string
}

/** Upload shown to the guest while it is in the queue. */
export interface BackgroundUploadTask extends UploadDetails {
  readonly mediaType: PostMediaType
  readonly previewUrl: string
  readonly progress: number
}

/** Upload as stored in IndexedDB. Older versions did not set `mediaType`. */
export interface StoredUpload extends UploadDetails {
  readonly fileBlob: Blob
  readonly fileName: string
  readonly fileType: string
  readonly mediaType?: PostMediaType
}

/** What the guest chose to post. */
export interface UploadRequest {
  readonly file: File
  readonly authorName: string
  readonly authorAvatarUrl?: string | null
  readonly caption: string | null
  readonly challengeId: number | null
  readonly challenge?: Challenge
  readonly clientSessionId: string
  readonly showOnProjector?: boolean
}

function getMediaType(file: File): PostMediaType {
  return isVideoFile(file) ? 'video' : 'image'
}

/**
 * Prepares a new upload, with its preview.
 *
 * @param isOffline - Checked after the preview is ready, which takes a while.
 */
export async function createUploadTask(
  { file, ...details }: UploadRequest,
  isOffline: () => boolean
): Promise<BackgroundUploadTask> {
  const createdAt = new Date().toISOString()
  const mediaType = getMediaType(file)
  const previewUrl = URL.createObjectURL(file)
  const blurDataUrl =
    mediaType === 'video' ? await extractVideoPoster(file) : await generateBlurPlaceholder(file)
  const isQueued = isOffline()

  return {
    ...details,
    id: generateUUID(),
    authorAvatarUrl: details.authorAvatarUrl ?? null,
    mediaType,
    previewUrl,
    blurDataUrl: blurDataUrl || undefined,
    progress: isQueued ? 0 : 8,
    status: isQueued ? 'queued-offline' : 'uploading',
    showOnProjector: details.showOnProjector ?? true,
    createdAt,
  }
}

export function toStoredUpload(
  { previewUrl: _previewUrl, progress: _progress, ...details }: BackgroundUploadTask,
  file: File
): StoredUpload {
  return {
    ...details,
    fileBlob: file,
    fileName: file.name,
    fileType: file.type,
  }
}

/**
 * Restores an upload left by a previous visit.
 *
 * An upload that was running stopped with the page, so it comes back as failed.
 */
export function fromStoredUpload(
  { fileBlob, fileName, fileType, ...details }: StoredUpload,
  isOffline: boolean
): { readonly task: BackgroundUploadTask; readonly file: File } {
  const file = new File([fileBlob], fileName, {
    type: fileType || 'image/webp',
  })
  const status = details.status === 'uploading' ? 'failed' : details.status
  const task: BackgroundUploadTask = {
    ...details,
    mediaType: details.mediaType ?? getMediaType(file),
    previewUrl: URL.createObjectURL(file),
    progress: 0,
    status: isOffline ? 'queued-offline' : status,
    showOnProjector: details.showOnProjector ?? true,
  }
  return { task, file }
}
