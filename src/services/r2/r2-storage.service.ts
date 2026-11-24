import { getAuthHeaders } from '@/services/api/api.client'

import type { StorageService } from '@/services/contracts/storage.contract'
import type { PresignedUploadResult, UploadProgressCallback } from '@/types/domain'

export class StorageUploadError extends Error {
  readonly statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'StorageUploadError'
    this.statusCode = statusCode
  }
}

/** Time without any progress before an upload is given up. */
const STALL_TIMEOUT_MS = 30_000

export class R2StorageService implements StorageService {
  private readonly apiBaseUrl: string

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl
  }

  async getPresignedUploadUrl(
    fileName: string,
    fileType: string,
    sizeBytes: number = 1024,
    signal?: AbortSignal
  ): Promise<PresignedUploadResult> {
    const response = await fetch(`${this.apiBaseUrl}/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({
        fileName,
        contentType: fileType,
        sizeBytes,
      }),
      signal,
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      throw new StorageUploadError(
        errorData.error || `Failed to request presigned upload URL: ${response.statusText}`,
        response.status
      )
    }

    return (await response.json()) as PresignedUploadResult
  }

  async uploadFile(
    file: File,
    onProgress?: UploadProgressCallback,
    signal?: AbortSignal
  ): Promise<string> {
    const cleanContentType =
      (file.type.split(';')[0] ?? '').trim().toLowerCase() || 'application/octet-stream'
    const { uploadUrl, publicUrl } = await this.requestUploadUrl(file, cleanContentType, signal)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      let stallTimer = 0
      const abort = () => xhr.abort()
      const watchForStall = () => {
        window.clearTimeout(stallTimer)
        stallTimer = window.setTimeout(abort, STALL_TIMEOUT_MS)
      }

      xhr.open('PUT', uploadUrl, true)
      xhr.setRequestHeader('Content-Type', cleanContentType)
      xhr.upload.onprogress = (event) => {
        watchForStall()
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(publicUrl)
        } else {
          reject(
            new StorageUploadError(
              `Upload to R2 failed with status ${xhr.status}: ${xhr.statusText}`
            )
          )
        }
      }
      xhr.onerror = () => reject(new StorageUploadError('Network error during file upload to R2'))
      xhr.onabort = () => reject(new StorageUploadError('Upload to R2 was aborted'))
      xhr.onloadend = () => {
        window.clearTimeout(stallTimer)
        signal?.removeEventListener('abort', abort)
      }

      signal?.addEventListener('abort', abort)
      watchForStall()
      xhr.send(file)
      if (signal?.aborted) abort()
    })
  }

  /** Asks for the upload URL, giving up when the server does not answer. */
  private async requestUploadUrl(
    file: File,
    contentType: string,
    signal?: AbortSignal
  ): Promise<PresignedUploadResult> {
    const controller = new AbortController()
    const abort = () => controller.abort()
    const timer = window.setTimeout(abort, STALL_TIMEOUT_MS)
    signal?.addEventListener('abort', abort)
    if (signal?.aborted) abort()
    try {
      return await this.getPresignedUploadUrl(file.name, contentType, file.size, controller.signal)
    } finally {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
  }
}
