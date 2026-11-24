import type { PresignedUploadResult, UploadProgressCallback } from '@/types/domain'

export interface StorageService {
  getPresignedUploadUrl(
    fileName: string,
    fileType: string,
    sizeBytes?: number
  ): Promise<PresignedUploadResult>
  /** @param signal - Cancels the upload. */
  uploadFile(file: File, onProgress?: UploadProgressCallback, signal?: AbortSignal): Promise<string>
}
