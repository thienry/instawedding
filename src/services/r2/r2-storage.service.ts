import type {
  PresignedUploadResult,
  UploadProgressCallback,
} from '../../types/domain'
import type { StorageService } from '../contracts/storage.contract'

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
    fileType: string
  ): Promise<PresignedUploadResult> {
    const response = await fetch(`${this.apiBaseUrl}/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, fileType }),
    })

    if (!response.ok) {
      throw new StorageUploadError(
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
    const { uploadUrl, publicUrl } = await this.getPresignedUploadUrl(
      file.name,
      file.type
    )

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl, true)
      xhr.setRequestHeader('Content-Type', file.type)

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
