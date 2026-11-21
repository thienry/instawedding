import { getOrCreateSessionId } from '@/utils/session'

import type { StorageService } from '@/services/contracts/storage.contract'
import type {
  PresignedUploadResult,
  UploadProgressCallback,
} from '@/types/domain'

export class StorageUploadError extends Error {
  readonly statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'StorageUploadError'
    this.statusCode = statusCode
  }
}

export class R2StorageService implements StorageService {
  private readonly apiBaseUrl: string

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl
  }

  async getPresignedUploadUrl(
    fileName: string,
    fileType: string,
    sizeBytes: number = 1024
  ): Promise<PresignedUploadResult> {
    const sessionId = getOrCreateSessionId()
    const response = await fetch(`${this.apiBaseUrl}/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        contentType: fileType,
        sizeBytes,
        sessionId,
      }),
    })

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      throw new StorageUploadError(
        errorData.error ||
          `Failed to request presigned upload URL: ${response.statusText}`,
        response.status
      )
    }

    return (await response.json()) as PresignedUploadResult
  }

  async uploadFile(
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<string> {
    const cleanContentType =
      (file.type.split(';')[0] ?? '').trim().toLowerCase() ||
      'application/octet-stream'
    const { uploadUrl, publicUrl } = await this.getPresignedUploadUrl(
      file.name,
      cleanContentType,
      file.size
    )

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl, true)
      xhr.setRequestHeader('Content-Type', cleanContentType)

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100)
            onProgress(percentage)
          }
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(publicUrl)
        } else {
          reject(
            new StorageUploadError(
              `Upload to R2 failed with status ${xhr.status}: ${xhr.statusText}`,
              xhr.status
            )
          )
        }
      }

      xhr.onerror = () => {
        reject(new StorageUploadError('Network error during file upload to R2'))
      }

      xhr.send(file)
    })
  }
}
